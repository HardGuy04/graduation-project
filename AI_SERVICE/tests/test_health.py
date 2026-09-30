"""Test health check endpoint."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_check_endpoint() -> None:
    """Verify /health returns 200 with expected structure."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_loaded" in data
    assert "model_version" in data
