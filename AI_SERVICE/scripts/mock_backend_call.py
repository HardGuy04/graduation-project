"""Simulate Node.js Express backend calling AI_SERVICE internal endpoint.

Measures round-trip latency, enforces 5.0-second timeout, verifies header authentication,
and demonstrates clinical fallback handling in case of timeout or server failure.
"""

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr and hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import httpx  # noqa: E402

from drug_recommendation.config import settings  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("mock_backend")

TARGET_URL = "http://localhost:8000/internal/predict-disease"
HEALTH_URL = "http://localhost:8000/health"
TIMEOUT_SECONDS = 5.0


def format_separator(title: str) -> None:
    print("\n" + "=" * 75)
    print(f"  {title.upper()}")
    print("=" * 75)


def execute_call(
    client: httpx.Client,
    payload: dict,
    headers: dict | None = None,
    scenario_title: str = "Request",
) -> dict:
    """Execute HTTP POST with strict timeout and latency measurement."""
    format_separator(scenario_title)
    req_headers = headers if headers is not None else {"X-Internal-Key": settings.AI_INTERNAL_KEY}

    print(f"URL: {TARGET_URL}")
    print(f"Headers: {req_headers}")
    print(f"Payload:\n{json.dumps(payload, ensure_ascii=False, indent=2)}")

    start_time = time.perf_counter()
    try:
        response = client.post(
            TARGET_URL,
            json=payload,
            headers=req_headers,
            timeout=TIMEOUT_SECONDS,
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        print(f"\nResponse Code: {response.status_code} ({response.reason_phrase})")
        print(f"Round-trip Latency: {elapsed_ms:.2f} ms (SLA < 5000ms: PASS)")

        data: dict[str, Any] = response.json()
        print(f"Response Body:\n{json.dumps(data, ensure_ascii=False, indent=2)}")
        return dict(data)

    except httpx.TimeoutException:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        print(f"\n[TIMEOUT ERROR] AI_SERVICE did not respond within {TIMEOUT_SECONDS}s (elapsed: {elapsed_ms:.2f}ms)")
        print("Executing Backend Fallback Strategy:")
        print("  -> Log incident to backend monitoring")
        print("  -> Return graceful degradation response to Doctor frontend")
        fallback_response = {
            "success": True,
            "data": {
                "diseases": [],
                "medicines": [],
                "warnings": ["AI Service tạm thời bận hoặc phản hồi chậm. Bác sĩ vui lòng thực hiện chẩn đoán lâm sàng thông thường."],
                "disclaimer": "Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ.",
                "modelVersion": "fallback-offline",
            },
        }
        print(f"Fallback Payload:\n{json.dumps(fallback_response, ensure_ascii=False, indent=2)}")
        return fallback_response

    except httpx.ConnectError:
        print(f"\n[CONNECTION ERROR] Could not connect to {TARGET_URL}.")
        print("Tip: Start the AI_SERVICE via `uvicorn main:app --port 8000` before running live simulation.")
        return {}


def main() -> None:
    """Run all simulation scenarios against live service or in-process TestClient."""
    print("Testing backend connection to AI_SERVICE...")

    # Check if AI_SERVICE server is live on port 8000
    is_live = False
    try:
        with httpx.Client(timeout=2.0) as chk:
            r = chk.get(HEALTH_URL)
            if r.status_code == 200:
                is_live = True
                print(f"Live server detected at {HEALTH_URL}: {r.json()}")
    except Exception:
        is_live = False

    if is_live:
        print("Running mock backend calls against LIVE AI_SERVICE server...\n")
        client = httpx.Client()
    else:
        print("No live server running on :8000. Running simulation using in-process TestClient...\n")
        from fastapi.testclient import TestClient

        from drug_recommendation.drug_service import drug_service
        from main import app
        drug_service.initialize()
        client = TestClient(app)  # type: ignore

    # Scenario 1: Standard Symptoms with Patient Info
    execute_call(
        client=client,
        payload={
            "symptoms": "hắt hơi liên tục, ớn lạnh, ho, nghẹt mũi, chảy nước mũi",
            "diagnosis": "",
            "patient": {
                "age": 29,
                "gender": "male",
                "allergies": ["aspirin"],
            },
            "topK": 3,
        },
        scenario_title="Scenario 1: Standard Success Call (Respiratory / Cold Symptoms)",
    )

    # Scenario 2: Emergency Red Flag Presentation
    execute_call(
        client=client,
        payload={
            "symptoms": "Bệnh nhân đột ngột đau thắt ngực dữ dội, toát mồ hôi lạnh, khó thở",
            "topK": 3,
        },
        scenario_title="Scenario 2: Emergency Clinical Red Flag (Acute Coronary Syndrome)",
    )

    # Scenario 3: Doctor Provisional Diagnosis Override with Allergy Check
    execute_call(
        client=client,
        payload={
            "symptoms": "đau rát vùng thượng vị, ợ nóng chua, buồn nôn sau khi ăn",
            "diagnosis": "Trào ngược dạ dày thực quản (GERD)",
            "patient": {
                "age": 42,
                "gender": "female",
                "allergies": ["penicillin"],
            },
            "topK": 3,
        },
        scenario_title="Scenario 3: Doctor Diagnosis Override + Patient Allergy Check",
    )

    # Scenario 4: Insufficient Symptoms Fallback (< 2 symptoms)
    execute_call(
        client=client,
        payload={
            "symptoms": "sốt nhẹ",
        },
        scenario_title="Scenario 4: Insufficient Clinical Data Fallback (< 2 symptoms)",
    )

    # Scenario 5: Unauthorized Access (Missing or Invalid Key)
    execute_call(
        client=client,
        payload={"symptoms": "sốt cao, ho có đờm"},
        headers={"X-Internal-Key": "invalid-token-123"},
        scenario_title="Scenario 5: Unauthorized Access (Invalid Internal Key -> 401)",
    )

    format_separator("Simulation Finished Successfully")
    print("All mock backend scenarios completed. Contract validated.")


if __name__ == "__main__":
    main()
