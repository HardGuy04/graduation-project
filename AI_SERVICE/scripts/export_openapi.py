"""Export OpenAPI schema specification to docs/openapi.json."""

import json
import logging
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from main import app  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("export_openapi")


def export_openapi() -> Path:
    """Generate OpenAPI 3.1 JSON specification from FastAPI app instance."""
    docs_dir = BASE_DIR / "docs"
    docs_dir.mkdir(parents=True, exist_ok=True)
    out_file = docs_dir / "openapi.json"

    openapi_data = app.openapi()
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(openapi_data, f, ensure_ascii=False, indent=2)

    logger.info(f"Exported OpenAPI specification successfully to {out_file}")
    return out_file


if __name__ == "__main__":
    export_openapi()
