"""Test chatbot router stub behavior."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_chatbot_stub_returns_501() -> None:
    """Verify chatbot endpoint returns 501 Not Implemented with standard error schema."""
    response = client.post("/internal/chatbot")
    assert response.status_code == 501
    payload = response.json()
    assert payload["success"] is False
    assert "not implemented" in payload["message"].lower()
    assert payload["error"] == "NotImplementedError"
