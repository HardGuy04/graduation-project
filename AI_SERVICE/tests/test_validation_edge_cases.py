"""Unit tests for edge cases and input validation rules."""

import pytest
from fastapi.testclient import TestClient

from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from main import app


@pytest.fixture(autouse=True)
def ensure_service_loaded() -> None:
    """Ensure drug service is initialized before tests."""
    drug_service.initialize()


def test_empty_or_whitespace_symptoms() -> None:
    """Whitespace-only symptoms must return 422 with descriptive validation error."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": "   "},
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"
        assert "quá ngắn" in payload["message"].lower() or "đầu vào không hợp lệ" in payload["message"].lower()


def test_numeric_only_symptoms() -> None:
    """Pure numbers as symptoms must return 422 with informative error."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": "123456789"},
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"
        assert "từ ngữ" in payload["message"] or "không hợp lệ" in payload["message"]


def test_punctuation_only_symptoms() -> None:
    """Punctuation / symbol garbage must return 422."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={"symptoms": "!@#$%^&*()_+???"},
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"


def test_invalid_negative_age() -> None:
    """Negative age must return 422 validation error."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "đau đầu, sốt nhẹ",
                "patient": {"age": -5, "gender": "male"},
            },
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"


def test_invalid_excessive_age() -> None:
    """Age over 120 must return 422 validation error."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "đau đầu, sốt nhẹ",
                "patient": {"age": 130, "gender": "male"},
            },
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"


def test_invalid_gender() -> None:
    """Unrecognized gender string must return 422."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "đau đầu, sốt nhẹ",
                "patient": {"age": 25, "gender": "alien"},
            },
        )
        assert response.status_code == 422
        payload = response.json()
        assert payload["success"] is False
        assert payload["error"] == "ValidationError"
        assert "giới tính" in payload["message"].lower()


def test_vietnamese_gender_normalization() -> None:
    """Vietnamese gender 'Nam' or 'Nữ' is normalized cleanly and accepted with 200 OK."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "đau đầu, sốt nhẹ, ho khan",
                "patient": {"age": 25, "gender": "Nam", "allergies": ["penicillin"]},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
