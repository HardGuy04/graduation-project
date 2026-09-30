"""Model training execution script for AI_SERVICE."""

import logging
import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from drug_recommendation.config import settings  # noqa: E402
from drug_recommendation.model.trainer import ModelTrainer  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("train")


def main() -> None:
    """Execute training pipeline and export artifacts."""
    logger.info("Starting model training pipeline...")
    trainer = ModelTrainer(random_state=42)
    metadata = trainer.train_and_save(
        train_path=settings.PROCESSED_DATA_DIR / "train.csv",
        val_path=settings.PROCESSED_DATA_DIR / "val.csv",
        output_dir=settings.ARTIFACTS_DIR,
    )

    print("=================================================================")
    print("MODEL TRAINING COMPLETED SUCCESSFULLY!")
    print(f"Selected Architecture: {metadata['selected_architecture']}")
    print(f"Artifacts: {settings.ARTIFACTS_DIR / 'model.joblib'}")
    print(f"Artifact Size: {metadata['model_size_mb']} MB")
    print(
        f"Validation Top-1 Accuracy: {metadata['validation_metrics']['top1_accuracy'] * 100:.2f}%"
    )
    print(
        f"Validation Top-3 Accuracy: {metadata['validation_metrics']['top3_accuracy'] * 100:.2f}%"
    )
    print(f"Validation Macro-F1: {metadata['validation_metrics']['macro_f1']:.4f}")
    print(
        f"Inference Latency: p50={metadata['latency_ms']['p50']}ms, p95={metadata['latency_ms']['p95']}ms"
    )
    print("=================================================================")


if __name__ == "__main__":
    main()
