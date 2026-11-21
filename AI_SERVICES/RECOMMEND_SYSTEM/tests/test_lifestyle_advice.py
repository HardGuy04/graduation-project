"""Unit tests for lifestyle, dietary, and precaution recommendations."""

import pytest
from fastapi.testclient import TestClient

from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from main import app


@pytest.fixture(autouse=True)
def ensure_service_loaded() -> None:
    """Ensure drug service and knowledge base are loaded."""
    drug_service.initialize()


def test_lifestyle_advice_presence_in_prediction() -> None:
    """Verify that predictions return diets, precautions, workouts in Vietnamese."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "hắt hơi liên tục, ớn lạnh, ho, nghẹt mũi",
                "patient": {"age": 28, "gender": "male", "allergies": []},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        assert payload["success"] is True
        data = payload["data"]

        # 1. Top lifestyle advice exists
        lifestyle = data.get("lifestyleAdvice")
        assert lifestyle is not None
        assert isinstance(lifestyle["disease"], str) and len(lifestyle["disease"]) > 0
        assert isinstance(lifestyle["diets"], list) and len(lifestyle["diets"]) > 0
        assert isinstance(lifestyle["precautions"], list) and len(lifestyle["precautions"]) > 0
        assert isinstance(lifestyle["workouts"], list) and len(lifestyle["workouts"]) > 0

        # 2. Each candidate disease also contains lifestyle guidance
        for dis in data["diseases"]:
            assert "diets" in dis
            assert "precautions" in dis
            assert "workouts" in dis
            assert isinstance(dis["diets"], list)
            assert isinstance(dis["precautions"], list)
            assert isinstance(dis["workouts"], list)


def test_kb_loader_lifestyle_lookup() -> None:
    """Verify kb_loader can fetch lifestyle advice by disease ID or Vietnamese name."""
    # Lookup by ID
    advice_fungal = drug_service.kb_loader.get_lifestyle_by_disease("fungal_infection")
    assert len(advice_fungal["diets"]) > 0
    assert len(advice_fungal["precautions"]) > 0

    # Lookup by Vietnamese name
    advice_allergy = drug_service.kb_loader.get_lifestyle_by_disease("Dị ứng")
    assert len(advice_allergy["diets"]) > 0
    assert len(advice_allergy["precautions"]) > 0


def test_medicine_dosage_and_instruction() -> None:
    """Verify recommended medicines contain non-empty clinical dosage and instructions."""
    with TestClient(app) as client:
        response = client.post(
            "/internal/predict-disease",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
            json={
                "symptoms": "hắt hơi liên tục, ớn lạnh, ho, nghẹt mũi",
                "patient": {"age": 28, "gender": "male", "allergies": []},
            },
        )
        assert response.status_code == 200
        payload = response.json()
        data = payload["data"]
        medicines = data["medicines"]
        assert len(medicines) > 0
        for med in medicines:
            assert "dosage" in med
            assert "instruction" in med
            assert len(med["dosage"]) > 0
            assert len(med["instruction"]) > 0
