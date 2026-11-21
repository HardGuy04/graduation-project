"""Unit and contract tests for disease medicine search endpoints."""

import pytest
from fastapi.testclient import TestClient

from drug_recommendation.config import settings
from drug_recommendation.drug_service import drug_service
from main import app


@pytest.fixture(autouse=True)
def ensure_service_loaded() -> None:
    """Ensure drug service is initialized before running tests."""
    drug_service.initialize()


def test_medicine_search_unauthorized() -> None:
    """Requests without valid X-Internal-Key must return 401."""
    with TestClient(app) as client:
        res = client.get("/internal/medicines-by-disease?disease=Sốt+xuất+huyết")
        assert res.status_code == 401
        payload = res.json()
        assert payload["success"] is False
        assert payload["error"] == "Unauthorized"


def test_medicine_search_dengue() -> None:
    """Search for 'Sốt xuất huyết' should return matched disease and indicated medicines."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/medicines-by-disease?disease=Sốt+xuất+huyết",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        data = payload["data"]
        assert data["found"] is True
        assert data["disease"] is not None
        assert "Sốt xuất huyết" in data["disease"]["name"]
        assert len(data["medicines"]) > 0

        # Verify medicines structure and ordering (Line 1 first)
        lines = [m["line"] for m in data["medicines"]]
        assert lines == sorted(lines)

        first_med = data["medicines"][0]
        assert "id" in first_med
        assert "name" in first_med
        assert "activeIngredient" in first_med
        assert "dosage" in first_med
        assert "instruction" in first_med


def test_medicine_search_unaccented_query() -> None:
    """Search with unaccented lowercase disease name should still match correctly."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/medicines-by-disease?disease=sot+ret",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        data = payload["data"]
        assert data["found"] is True
        assert data["disease"]["id"].lower() == "malaria"


def test_medicine_search_not_found_returns_suggestions() -> None:
    """Search with unknown disease query should return found=False with suggestion list."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/medicines-by-disease?disease=benh_khong_ton_tai_xyz",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        data = payload["data"]
        assert data["found"] is False
        assert data["disease"] is None
        assert data["totalMedicines"] == 0
        assert len(data["suggestedDiseases"]) > 0


def test_list_all_diseases() -> None:
    """GET /internal/diseases should return all 41 diseases from the knowledge base."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/diseases",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        diseases = payload["data"]
        assert len(diseases) == 41
        first_d = diseases[0]
        assert "id" in first_d
        assert "name" in first_d
        assert "specialty" in first_d


def test_diseases_by_medicine_unauthorized() -> None:
    """GET /internal/diseases-by-medicine without key must return 401."""
    with TestClient(app) as client:
        res = client.get("/internal/diseases-by-medicine?medicine=Fluconazole")
        assert res.status_code == 401


def test_diseases_by_medicine_found() -> None:
    """Reverse lookup: Search for Fluconazole should return medicine info and indicated diseases."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/diseases-by-medicine?medicine=Fluconazole",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        data = payload["data"]
        assert data["found"] is True
        assert data["medicine"] is not None
        assert "Fluconazole" in data["medicine"]["name"]
        assert len(data["indicatedDiseases"]) > 0

        # Check indicated disease structure
        first_ind = data["indicatedDiseases"][0]
        assert "id" in first_ind
        assert "name" in first_ind
        assert "specialty" in first_ind
        assert "line" in first_ind


def test_diseases_by_medicine_unaccented() -> None:
    """Reverse lookup with lowercase unaccented name should match properly."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/diseases-by-medicine?medicine=antifungal+cream",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        data = payload["data"]
        assert data["found"] is True
        assert data["medicine"]["id"] == "med_antifungal_cream"


def test_diseases_by_medicine_not_found() -> None:
    """Reverse lookup with unknown drug name should return found=False with suggestions."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/diseases-by-medicine?medicine=thuoc_khong_ton_tai_xyz",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        data = payload["data"]
        assert data["found"] is False
        assert data["medicine"] is None
        assert len(data["suggestedMedicines"]) > 0


def test_list_all_medicines() -> None:
    """GET /internal/medicines should return list of all medicines for autocomplete."""
    with TestClient(app) as client:
        res = client.get(
            "/internal/medicines",
            headers={"X-Internal-Key": settings.AI_INTERNAL_KEY},
        )
        assert res.status_code == 200
        payload = res.json()
        assert payload["success"] is True
        meds = payload["data"]
        assert len(meds) >= 100
        first_m = meds[0]
        assert "id" in first_m
        assert "name" in first_m
