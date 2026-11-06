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


def test_root_endpoint() -> None:
    """Verify / returns 200 with service information and demo_url."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "/demo" in data["demo_url"]


def test_demo_page_endpoint() -> None:
    """Verify /demo returns 200 HTML page with CDSS interactive demo."""
    response = client.get("/demo")
    assert response.status_code == 200
    assert "text/html" in response.headers.get("content-type", "")
    assert "Hệ thống Khuyến nghị Y tế AI" in response.text
