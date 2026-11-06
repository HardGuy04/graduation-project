"""Tests for Drug-Drug Interaction (DDI) clinical safety checking."""

from fastapi.testclient import TestClient

from drug_recommendation.knowledge.ddi_checker import ddi_checker
from main import app

client = TestClient(app)
VALID_INTERNAL_KEY = "dev-internal-secret-key-change-in-prod"


def test_ddi_checker_contraindicated_pair():
    """Verify that Aspirin + Blood thinners triggers a Contraindicated alert."""
    result = ddi_checker.check_interactions(["Aspirin", "Blood thinners"])
    assert result["totalInteractions"] >= 1
    assert result["hasCriticalConflict"] is True
    assert result["severitySummary"]["contraindicated"] >= 1

    interaction = result["interactions"][0]
    assert interaction["severity"] == "contraindicated"
    assert "xuất huyết" in interaction["clinicalEffect"].lower()


def test_ddi_checker_major_pair():
    """Verify that Aspirin + NSAIDs triggers a Major alert."""
    result = ddi_checker.check_interactions(["Aspirin", "NSAIDs"])
    assert result["totalInteractions"] >= 1
    assert result["hasCriticalConflict"] is True
    assert result["severitySummary"]["major"] >= 1

    interaction = result["interactions"][0]
    assert interaction["severity"] == "major"
    assert "dạ dày" in interaction["clinicalEffect"].lower()


def test_ddi_checker_safe_pair():
    """Verify that non-conflicting drugs report zero interactions."""
    result = ddi_checker.check_interactions(["Paracetamol", "Antifungal Cream"])
    assert result["totalInteractions"] == 0
    assert result["hasCriticalConflict"] is False
    assert result["severitySummary"]["total"] == 0


def test_ddi_api_unauthorized():
    """Verify that /internal/check-ddi requires internal API key."""
    res = client.post("/internal/check-ddi", json={"drugs": ["Aspirin", "NSAIDs"]})
    assert res.status_code == 401


def test_ddi_api_post_success():
    """Verify POST /internal/check-ddi with valid key and interacting drugs."""
    payload = {"drugs": ["Aspirin", "NSAIDs", "Corticosteroids"]}
    res = client.post(
        "/internal/check-ddi",
        headers={"X-Internal-Key": VALID_INTERNAL_KEY},
        json=payload,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["totalInteractions"] >= 2
    assert data["data"]["hasCriticalConflict"] is True


def test_ddi_api_get_success():
    """Verify GET /internal/check-ddi with query string."""
    res = client.get(
        "/internal/check-ddi?drugs=Beta-blockers,Calcium channel blockers",
        headers={"X-Internal-Key": VALID_INTERNAL_KEY},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["totalInteractions"] >= 1
    assert data["data"]["hasCriticalConflict"] is True


def test_ddi_api_validation_error():
    """Verify validation when fewer than 2 drugs are provided."""
    res = client.post(
        "/internal/check-ddi",
        headers={"X-Internal-Key": VALID_INTERNAL_KEY},
        json={"drugs": ["Aspirin"]},
    )
    assert res.status_code == 422
