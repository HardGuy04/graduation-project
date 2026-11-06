"""Test internal chatbot endpoint."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_chatbot_rule_based_specialties() -> None:
    """Verify /internal/chatbot answers specialty queries via rule-based."""
    response = client.post(
        "/internal/chatbot",
        json={"message": "Phòng khám có những chuyên khoa nào?", "role": "patient", "userId": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert data["source"] == "rule_based"
    assert "chuyên khoa" in data["reply"].lower()


def test_chatbot_ml_intent_fever() -> None:
    """Verify /internal/chatbot classifies common medical intent via ML."""
    response = client.post(
        "/internal/chatbot",
        json={"message": "Bị sốt cao thì nên làm gì?", "role": "patient", "userId": 1},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert data["intent"] == "fever"
    assert data["source"] in ("ml_model", "rule_based")


def test_chatbot_greeting() -> None:
    """Verify /internal/chatbot handles greetings."""
    response = client.post(
        "/internal/chatbot",
        json={"message": "Xin chào trợ lý", "role": "patient"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert data["intent"] == "greeting"


def test_chatbot_empty_message() -> None:
    """Verify /internal/chatbot rejects empty message with 422."""
    response = client.post(
        "/internal/chatbot",
        json={"message": "", "role": "patient"},
    )
    assert response.status_code == 422
