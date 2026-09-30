"""Contract tests for internal disease prediction endpoint."""

from fastapi.testclient import TestClient

from drug_recommendation.config import settings
from main import app

client = TestClient(app)


def test_predict_disease_missing_key() -> None:
    """Missing X-Internal-Key header must return 401 with standard error format."""
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
    response = client.post(
        "/internal/predict-disease",
        headers={"X-Internal-Key": "wrong-secret-key"},
        json={"symptoms": "đau họng, sốt nhẹ"},
    )
    assert response.status_code == 401
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"] == "Unauthorized"


def test_predict_disease_model_not_loaded() -> None:
    """Valid key but model not loaded must return 503 Service Unavailable."""
    response = client.post(
        "/internal/predict-disease",
        headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        json={"symptoms": "đau họng, sốt nhẹ"},
    )
    assert response.status_code == 503
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"] == "ServiceUnavailable"


def test_predict_disease_validation_error() -> None:
    """Invalid request body must return 422 with standard error format."""
    response = client.post(
        "/internal/predict-disease",
        headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        json={"symptoms": ""},  # empty string violates min_length=1
    )
    assert response.status_code == 422
    payload = response.json()
    assert payload["success"] is False
    assert payload["error"] == "ValidationError"
