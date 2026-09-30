"""Configuration module for AI_SERVICE.

Calculates relative paths from the root of AI_SERVICE and loads environment settings.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Base directory is the root of AI_SERVICE (parent of drug_recommendation)
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from BASE_DIR if present
load_dotenv(BASE_DIR / ".env")


class Settings:
    """Application settings with environment variable overrides."""

    # Security & Authentication
    AI_INTERNAL_KEY: str = os.getenv("AI_INTERNAL_KEY", "dev-internal-secret-key-change-in-prod")

    # Knowledge Base settings
    KB_REQUIRE_REVIEWED: bool = os.getenv("KB_REQUIRE_REVIEWED", "false").strip().lower() in (
        "true",
        "1",
        "yes",
    )

    # NLP thresholds
    FUZZY_THRESHOLD: int = int(os.getenv("FUZZY_THRESHOLD", "90"))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO").upper()

    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))

    # Paths (all relative to BASE_DIR)
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = BASE_DIR / "data"
    RAW_DATA_DIR: Path = BASE_DIR / "dataset"
    DATA_RAW_DIR: Path = BASE_DIR / "data" / "raw"
    PROCESSED_DATA_DIR: Path = BASE_DIR / "data" / "processed"
    KB_DIR: Path = BASE_DIR / "data" / "kb"
    ARTIFACTS_DIR: Path = BASE_DIR / "drug_recommendation" / "artifacts"
    REPORTS_DIR: Path = BASE_DIR / "reports"
    DOCS_DIR: Path = BASE_DIR / "docs"

    # Model artifact paths
    MODEL_PATH: Path = ARTIFACTS_DIR / "model.joblib"
    METADATA_PATH: Path = ARTIFACTS_DIR / "metadata.json"


settings = Settings()
