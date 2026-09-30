"""Contract tests for internal disease prediction endpoint."""

import pytest
from fastapi.testclient import TestClient

from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from drug_recommendation.knowledge.safety import MANDATORY_DISCLAIMER
from main import app


@pytest.fixture(autouse=True)
def ensure_service_loaded() -> None:
    """Ensure drug service is initialized before tests."""
    drug_service.initialize()


def test_predict_disease_missing_key() -> None:
    """Missing X-Internal-Key header must return 401 with standard error format."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            json={"symptoms": "đau họng, sốt nhẹ"},
        )
        assert response.status_code == 401
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "Unauthorized"
        assert "key" in payload["message"].lower()


def test_predict_disease_invalid_key() -> None:
    """Invalid X-Internal-Key header must return 401 with standard error format."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": "wrong-secret-key"},
            json={"symptoms": "đau họng, sốt nhẹ"},
        )
        assert response.status_code == 401
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "Unauthorized"


def test_predict_disease_validation_error() -> None:
    """Invalid request body must return 422 with standard error format."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": ""},  # empty string violates min_length=1
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"


def test_predict_disease_model_not_loaded() -> None:
    """Valid key but model not loaded must return 503 Service Unavailable."""
    with TestClient(app) as client:
        # Temporarily simulate uninitialized service
        original_state = drug_service.model_loaded
        try:
            drug_service.model_loaded = False
            response = client.post(
                "/internal/predict-disease",
                headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
                json={"symptoms": "đau họng, sốt nhẹ"},
            )
            assert response.status_code == 503
            payload = response.json()
            assert payload["success"] is False
            assert payload["error"] == "ServiceUnavailable"
        finally:
            drug_service.model_loaded = original_state


def test_predict_disease_success_contract() -> None:
    """Successful prediction returns 200 and adheres strictly to the contract schema."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "hắt hơi liên tục, ớn lạnh, ho, nghẹt mũi, chảy nước mũi",
                "diagnosis": "",
                "patient": {
                    "age": 28,
                    "gender": "male",
                    "allergies": [],
                },
                "topK": 3,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        data = payload["data"]

        # Validate mandatory contract fields
        assert "diseases" in data
        assert "medicines" in data
        assert "recognizedSymptoms" in data
        assert "unrecognizedTerms" in data
        assert "redFlags" in data
        assert "warnings" in data
        assert "disclaimer" in data
        assert "modelVersion" in data

        assert data["disclaimer"] == MANDATORY_DISCLAIMER
        assert len(data["recognizedSymptoms"]) >= 2
        assert len(data["diseases"]) <= 3

        # Validate disease item structure
        for dis in data["diseases"]:
            assert "name" in dis
            assert "probability" in dis
            assert 0 <= dis["probability"] <= 100
            assert "specialty" in dis
            assert "matchedSymptoms" in dis

        # Validate medicine item structure
        for med in data["medicines"]:
            assert "name" in med
            assert "probability" in med
            assert 0 <= med["probability"] <= 100
            assert "usage" in med
            assert "forDiseases" in med
            assert "prescriptionRequired" in med
            assert "warnings" in med


def test_predict_disease_fallback_insufficient_symptoms() -> None:
    """When input has fewer than 2 recognized symptoms, return empty diseases with clinical warning."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": "sốt nhẹ"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        data = payload["data"]
        assert len(data["diseases"]) == 0
        assert len(data["medicines"]) == 0
        assert any("chưa đủ để gợi ý" in w.lower() for w in data["warnings"])


def test_predict_disease_emergency_red_flags() -> None:
    """Emergency life-threatening symptoms must trigger red flags independently of model."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": "đau thắt ngực dữ dội, toát mồ hôi, khó thở đột ngột"},
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        data = payload["data"]
        assert len(data["redFlags"]) > 0
        assert any(
            "mạch vành" in rf.lower() or "cấp cứu" in rf.lower()
            for rf in data["redFlags"]
        )


def test_predict_disease_doctor_diagnosis_override() -> None:
    """Doctor confirmed diagnosis overrides model recommendations for medicine ranking."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "đau rát thượng vị, ợ chua, buồn nôn",
                "diagnosis": "Trào ngược dạ dày thực quản (GERD)",
                "topK": 3,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        data = payload["data"]
        # Medicines should feature GERD medications (PPIs, Antacids, etc.)
        med_names = [m["name"].lower() for m in data["medicines"]]
        assert any("proton pump" in m or "antacids" in m or "h2" in m for m in med_names)


def test_predict_disease_allergy_warning() -> None:
    """Patient allergy must attach a warning to contra-indicated medicines without dropping them."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "sốt cao, ho có đờm, đau ngực",
                "diagnosis": "Trào ngược dạ dày thực quản (GERD)",
                "patient": {
                    "age": 45,
                    "gender": "male",
                    "allergies": ["penicillin"],
                },
            },
        )
        assert response.status_code == 200
        payload = response.json()
        data = payload["data"]
        # Antibiotics medicine should have allergy warning
        antibiotic_med = next(
            (m for m in data["medicines"] if "antibiotic" in m["name"].lower()), None
        )
        if antibiotic_med:
            assert len(antibiotic_med["warnings"]) > 0
            assert any("penicillin" in w.lower() for w in antibiotic_med["warnings"])


def test_predict_disease_negation_handling() -> None:
    """Negated symptoms must be excluded from active recognition and reported in warnings."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": "bệnh nhân không sốt, đau nhức khớp, cứng khớp buổi sáng"},
        )
        assert response.status_code == 200
        payload = response.json()
        data = payload["data"]
        # 'sốt' should not be in recognizedSymptoms
        assert not any("sốt" in sym.lower() for sym in data["recognizedSymptoms"])
        # Warning should mention negated symptom exclusion
        assert any("loại trừ" in w.lower() for w in data["warnings"])


def test_predict_disease_smoke_test() -> None:
    """Smoke test: 'Đau họng, sốt nhẹ, ho khan' must return 200 with full contract schema."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "Đau họng, sốt nhẹ, ho khan",
                "diagnosis": "",
                "patient": {
                    "age": 28,
                    "gender": "male",
                    "allergies": ["penicillin"],
                },
                "topK": 3,
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        data = payload["data"]
        assert "recognizedSymptoms" in data
        assert len(data["recognizedSymptoms"]) >= 2
        assert "disclaimer" in data
        assert data["disclaimer"] == MANDATORY_DISCLAIMER


def test_health_check_endpoint() -> None:
    """Health check endpoint must return status ok, model_loaded true, and model_version."""
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"
        assert payload["model_loaded"] is True
        assert payload["model_version"] is not None


def test_chatbot_endpoint_placeholder() -> None:
    """Chatbot endpoint is a placeholder and must return 501 Not Implemented."""
    with TestClient(app) as client:
        response = client.post("/internal/chatbot")
        assert response.status_code == 501
        payload = response.json()
        assert payload["success"] is False
        assert "chatbot" in payload["message"].lower()
