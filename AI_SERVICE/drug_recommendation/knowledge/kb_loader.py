"""Knowledge Base loader and clinical data cache module.

Loads diseases, symptoms, medicines, and associations from CSV files into memory,
verifies integrity, and enforces clinical review governance.
"""

import csv
import json
import logging
from pathlib import Path
from typing import Any

from drug_recommendation.config import settings

logger = logging.getLogger("kb_loader")


class KBLoader:
    """In-memory cache and loader for clinical Knowledge Base."""

    def __init__(self, kb_dir: Path | None = None) -> None:
        self.kb_dir = kb_dir or settings.KB_DIR
        self.diseases_by_id: dict[str, dict[str, Any]] = {}
        self.diseases_by_name: dict[str, dict[str, Any]] = {}
        self.symptoms_by_id: dict[str, dict[str, Any]] = {}
        self.medicines_by_id: dict[str, dict[str, Any]] = {}
        self.disease_medicines: dict[str, list[dict[str, Any]]] = {}
        self.disease_lifestyles: dict[str, dict[str, Any]] = {}
        self.unreviewed_count: int = 0
        self.is_loaded: bool = False

    def load(self) -> None:
        """Load all KB files into memory and verify review constraints."""
        logger.info(f"Loading Knowledge Base from {self.kb_dir}...")
        self.unreviewed_count = 0

        # 1. Load diseases.csv
        dis_file = self.kb_dir / "diseases.csv"
        if not dis_file.exists():
            raise FileNotFoundError(f"Missing {dis_file}")

        with open(dis_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                d_id = r["id"].strip()
                reviewed = r.get("reviewed", "false").strip().lower() == "true"
                if not reviewed:
                    self.unreviewed_count += 1

                item = {
                    "id": d_id,
                    "name_vi": r["name_vi"].strip(),
                    "name_en": r["name_en"].strip(),
                    "specialty": r["specialty"].strip(),
                    "description": r.get("description", "").strip(),
                    "aliases": [a.strip() for a in r.get("aliases", "").split(";") if a.strip()],
                    "red_flag": r.get("red_flag", "false").strip().lower() == "true",
                    "reviewed": reviewed,
                }
                self.diseases_by_id[d_id] = item
                self.diseases_by_name[str(item["name_vi"]).lower()] = item
                self.diseases_by_name[str(item["name_en"]).lower()] = item

        # 2. Load symptoms.csv
        sym_file = self.kb_dir / "symptoms.csv"
        if not sym_file.exists():
            raise FileNotFoundError(f"Missing {sym_file}")

        with open(sym_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                s_id = r["id"].strip()
                reviewed = r.get("reviewed", "false").strip().lower() == "true"
                if not reviewed:
                    self.unreviewed_count += 1

                self.symptoms_by_id[s_id] = {
                    "id": s_id,
                    "name_vi": r["name_vi"].strip(),
                    "name_en": r["name_en"].strip(),
                    "category": r.get("category", "Toàn thân").strip(),
                    "severity_weight": int(r.get("severity_weight", 3)),
                    "reviewed": reviewed,
                }

        # 3. Load medicines.csv
        med_file = self.kb_dir / "medicines.csv"
        if not med_file.exists():
            raise FileNotFoundError(f"Missing {med_file}")

        with open(med_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                m_id = r["id"].strip()
                reviewed = r.get("reviewed", "false").strip().lower() == "true"
                if not reviewed:
                    self.unreviewed_count += 1

                contra = [
                    c.strip().lower()
                    for c in r.get("contraindications", "").split(";")
                    if c.strip()
                ]

                self.medicines_by_id[m_id] = {
                    "id": m_id,
                    "name": r["name"].strip(),
                    "active_ingredient": r.get("active_ingredient", "").strip(),
                    "group": r.get("group", "").strip(),
                    "usage": r.get("usage", "").strip(),
                    "dosage": r.get("dosage", "").strip(),
                    "instruction": r.get("instruction", "").strip(),
                    "prescription_required": r.get("prescription_required", "true").strip().lower()
                    == "true",
                    "contraindications": contra,
                    "reviewed": reviewed,
                }

        # 4. Load disease_medicine.csv
        dm_file = self.kb_dir / "disease_medicine.csv"
        if not dm_file.exists():
            raise FileNotFoundError(f"Missing {dm_file}")

        with open(dm_file, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                d_id = r["disease_id"].strip()
                m_id = r["medicine_id"].strip()
                reviewed = r.get("reviewed", "false").strip().lower() == "true"
                if not reviewed:
                    self.unreviewed_count += 1

                if d_id not in self.disease_medicines:
                    self.disease_medicines[d_id] = []

                self.disease_medicines[d_id].append(
                    {
                        "disease_id": d_id,
                        "medicine_id": m_id,
                        "weight": float(r.get("weight", 0.5)),
                        "line": int(r.get("line", 1)),
                        "note": r.get("note", "").strip(),
                        "reviewed": reviewed,
                    }
                )

        # 5. Load disease_lifestyle.csv (if exists)
        ls_file = self.kb_dir / "disease_lifestyle.csv"
        if ls_file.exists():
            with open(ls_file, encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for r in reader:
                    d_id = r["disease_id"].strip()
                    try:
                        diets = json.loads(r.get("diets", "[]"))
                    except Exception:
                        diets = []
                    try:
                        precautions = json.loads(r.get("precautions", "[]"))
                    except Exception:
                        precautions = []
                    try:
                        workouts = json.loads(r.get("workouts", "[]"))
                    except Exception:
                        workouts = []

                    item = {
                        "disease_id": d_id,
                        "disease_name_vi": r.get("disease_name_vi", "").strip(),
                        "diets": diets,
                        "precautions": precautions,
                        "workouts": workouts,
                    }
                    self.disease_lifestyles[d_id] = item
                    self.disease_lifestyles[str(r.get("disease_name_vi", "")).strip().lower()] = item

        # 6. Governance check
        if self.unreviewed_count > 0:
            msg = f"Knowledge Base contains {self.unreviewed_count} unreviewed records."
            if settings.KB_REQUIRE_REVIEWED:
                raise RuntimeError(
                    f"KB_REQUIRE_REVIEWED is true, but unreviewed records exist: {msg}"
                )
            logger.warning(
                f"{msg} Set KB_REQUIRE_REVIEWED=true for production after clinical sign-off."
            )

        self.is_loaded = True
        logger.info(
            f"Knowledge Base successfully loaded: {len(self.diseases_by_id)} diseases, "
            f"{len(self.symptoms_by_id)} symptoms, {len(self.medicines_by_id)} medicines, "
            f"{len(self.disease_lifestyles)} lifestyle entries."
        )

    def get_lifestyle_by_disease(self, disease_id_or_name: str) -> dict[str, list[str]]:
        """Retrieve diets, precautions, and workouts for a disease by ID or name."""
        clean = disease_id_or_name.strip().lower()
        if clean in self.disease_lifestyles:
            item = self.disease_lifestyles[clean]
            return {
                "diets": item["diets"],
                "precautions": item["precautions"],
                "workouts": item["workouts"],
            }
        if disease_id_or_name in self.disease_lifestyles:
            item = self.disease_lifestyles[disease_id_or_name]
            return {
                "diets": item["diets"],
                "precautions": item["precautions"],
                "workouts": item["workouts"],
            }
        return {"diets": [], "precautions": [], "workouts": []}


kb_loader = KBLoader()
