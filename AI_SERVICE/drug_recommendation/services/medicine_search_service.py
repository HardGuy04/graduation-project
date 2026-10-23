"""Medicine and disease bi-directional search service.

Provides forward lookup (Disease -> indicated Medicines) and
reverse lookup (Medicine / Active ingredient -> indicated Diseases).
"""

import logging
from typing import Any

import rapidfuzz.fuzz as fuzz

from drug_recommendation.knowledge.kb_loader import KBLoader
from drug_recommendation.knowledge.medicine_ranker import MedicineRanker
from drug_recommendation.model.predictor import DiseasePredictor
from drug_recommendation.nlp.normalizer import strip_accents
from drug_recommendation.nlp.symptom_extractor import SymptomExtractor
from drug_recommendation.schemas import (
    DiseaseDetailSearchItem,
    DiseaseMedicineSearchData,
    DiseaseMedicineSearchItem,
    MedicineDetailSearchItem,
    MedicineDiseaseIndicationItem,
    MedicineSearchData,
)

logger = logging.getLogger("ai_service.medicine_search_service")


class MedicineSearchService:
    """Service handling bi-directional querying of medicines, diseases, and clinical protocols."""

    def __init__(
        self,
        kb_loader: KBLoader,
        ranker: MedicineRanker,
        extractor: SymptomExtractor | None = None,
        predictor: DiseasePredictor | None = None,
    ) -> None:
        self.kb_loader = kb_loader
        self.ranker = ranker
        self.extractor = extractor
        self.predictor = predictor

    def update_components(
        self, extractor: SymptomExtractor | None, predictor: DiseasePredictor | None
    ) -> None:
        """Update runtime extractor and predictor references."""
        self.extractor = extractor
        self.predictor = predictor

    def get_all_diseases(self) -> list[dict[str, Any]]:
        """Return all recognized diseases with metadata for autocomplete / quick search."""
        if not self.kb_loader.is_loaded:
            self.kb_loader.load()

        diseases = []
        for d in self.kb_loader.diseases_by_id.values():
            diseases.append(
                {
                    "id": d["id"],
                    "name": d["name_vi"],
                    "name_en": d.get("name_en", ""),
                    "specialty": d.get("specialty", "Nội khoa"),
                    "description": d.get("description", ""),
                }
            )
        return sorted(diseases, key=lambda x: x["name"])

    def search_medicines_by_disease(self, query: str) -> DiseaseMedicineSearchData:
        """Search all medicines indicated for a given disease name or code.

        Supports Vietnamese with/without diacritics, English name, and disease ID.
        Returns matched disease details, symptoms, lifestyle advice, and ordered medicines
        (First-line medicines prioritized before second-line medicines).
        """
        if not self.kb_loader.is_loaded:
            self.kb_loader.load()

        clean_q = query.strip()
        if not clean_q:
            return DiseaseMedicineSearchData(
                found=False,
                query="",
                message="Vui lòng nhập tên bệnh để tra cứu thuốc điều trị.",
                disease=None,
                totalMedicines=0,
                medicines=[],
                suggestedDiseases=self.get_all_diseases()[:10],
            )

        clean_unacc = strip_accents(clean_q.lower())

        # 1. Match by Disease ID
        matched_disease: dict[str, Any] | None = (
            self.kb_loader.diseases_by_id.get(clean_q.upper())
            or self.kb_loader.diseases_by_id.get(clean_q)
        )

        # 2. Match exact name_vi, name_en, or aliases
        if not matched_disease:
            for item in self.kb_loader.diseases_by_id.values():
                vi_unacc = strip_accents(item["name_vi"].lower())
                en_unacc = strip_accents(item.get("name_en", "").lower())
                aliases_unacc = [
                    strip_accents(a.lower()) for a in item.get("aliases", [])
                ]
                if clean_unacc == vi_unacc or clean_unacc == en_unacc or clean_unacc in aliases_unacc:
                    matched_disease = item
                    break

        # 3. Fuzzy match using medicine ranker
        if not matched_disease:
            matched_disease = self.ranker.match_doctor_diagnosis(clean_q)

        # 4. Fallback substring matching
        if not matched_disease:
            for item in self.kb_loader.diseases_by_id.values():
                vi_unacc = strip_accents(item["name_vi"].lower())
                en_unacc = strip_accents(item.get("name_en", "").lower())
                if clean_unacc in vi_unacc or clean_unacc in en_unacc or vi_unacc in clean_unacc:
                    matched_disease = item
                    break

        # Find suggestions (similar or other matching diseases)
        suggested: list[tuple[float, dict[str, str]]] = []
        for item in self.kb_loader.diseases_by_id.values():
            if matched_disease and item["id"] == matched_disease["id"]:
                continue
            vi_unacc = strip_accents(item["name_vi"].lower())
            en_unacc = strip_accents(item.get("name_en", "").lower())
            score = max(
                fuzz.token_set_ratio(clean_unacc, vi_unacc),
                fuzz.token_set_ratio(clean_unacc, en_unacc),
            )
            is_substr = (clean_unacc in vi_unacc) or (clean_unacc in en_unacc)
            if is_substr or score >= 50:
                suggested.append(
                    (
                        score + (30 if is_substr else 0),
                        {
                            "id": item["id"],
                            "name": item["name_vi"],
                            "name_en": item.get("name_en", ""),
                            "specialty": item.get("specialty", ""),
                        },
                    )
                )

        suggested.sort(key=lambda x: x[0], reverse=True)
        suggested_diseases = [s[1] for s in suggested[:8]]

        # If not matched at all
        if not matched_disease:
            return DiseaseMedicineSearchData(
                found=False,
                query=clean_q,
                message=f"Không tìm thấy bệnh lý phù hợp với từ khóa '{clean_q}'. Quý bác sĩ/người dùng có thể chọn các gợi ý bên dưới hoặc kiểm tra lại tên bệnh.",
                disease=None,
                totalMedicines=0,
                medicines=[],
                suggestedDiseases=suggested_diseases or self.get_all_diseases()[:8],
            )

        # Retrieve disease details
        d_id = matched_disease["id"]
        ls = self.kb_loader.get_lifestyle_by_disease(d_id)
        if not ls["diets"] and not ls["precautions"]:
            ls = self.kb_loader.get_lifestyle_by_disease(matched_disease["name_vi"])

        # Characteristic symptoms
        symptom_display_list: list[str] = []
        if self.predictor and hasattr(self.predictor, "disease_symptom_map"):
            sym_ids = (
                self.predictor.disease_symptom_map.get(matched_disease.get("name_en", ""))
                or self.predictor.disease_symptom_map.get(d_id)
                or self.predictor.disease_symptom_map.get(matched_disease["name_vi"])
                or set()
            )
            name_map = self.extractor.symptom_names if self.extractor else {}
            for s in sorted(sym_ids):
                symptom_display_list.append(name_map.get(s, s.replace("_", " ")))

        disease_detail = DiseaseDetailSearchItem(
            id=d_id,
            name=matched_disease["name_vi"],
            name_en=matched_disease.get("name_en", ""),
            specialty=matched_disease.get("specialty", "Nội khoa"),
            description=matched_disease.get("description", ""),
            symptoms=symptom_display_list,
            diets=ls.get("diets", []),
            precautions=ls.get("precautions", []),
            workouts=ls.get("workouts", []),
        )

        # Retrieve mapped medicines
        mappings = self.kb_loader.disease_medicines.get(d_id, [])
        med_items: list[DiseaseMedicineSearchItem] = []
        for m in mappings:
            med_info = self.kb_loader.medicines_by_id.get(m["medicine_id"])
            if med_info:
                med_items.append(
                    DiseaseMedicineSearchItem(
                        id=med_info["id"],
                        name=med_info["name"],
                        activeIngredient=med_info.get("active_ingredient", ""),
                        group=med_info.get("group", ""),
                        usage=med_info.get("usage", ""),
                        dosage=med_info.get("dosage", ""),
                        instruction=med_info.get("instruction", ""),
                        prescriptionRequired=med_info.get("prescription_required", True),
                        contraindications=med_info.get("contraindications", []),
                        line=int(m.get("line", 1)),
                        weight=float(m.get("weight", 0.5)),
                        note=m.get("note", ""),
                    )
                )

        # Sort: Line 1 first (line ascending), then highest weight descending, then alphabetical
        med_items.sort(key=lambda x: (x.line, -x.weight, x.name))

        return DiseaseMedicineSearchData(
            found=True,
            query=clean_q,
            message=f"Đã tìm thấy {len(med_items)} thuốc điều trị cho bệnh lý '{matched_disease['name_vi']}'.",
            disease=disease_detail,
            totalMedicines=len(med_items),
            medicines=med_items,
            suggestedDiseases=suggested_diseases,
        )

    def get_all_medicines(self) -> list[dict[str, Any]]:
        """Return all recognized medicines with basic metadata for autocomplete / quick search."""
        if not self.kb_loader.is_loaded:
            self.kb_loader.load()

        meds = []
        for m in self.kb_loader.medicines_by_id.values():
            meds.append(
                {
                    "id": m["id"],
                    "name": m["name"],
                    "activeIngredient": m.get("active_ingredient", ""),
                    "group": m.get("group", ""),
                    "prescriptionRequired": m.get("prescription_required", True),
                }
            )
        return sorted(meds, key=lambda x: x["name"])

    def search_diseases_by_medicine(self, query: str) -> MedicineSearchData:
        """Reverse lookup: Find all diseases indicated for a given medicine name or active ingredient.

        Supports medicine ID, commercial name, and active pharmaceutical ingredient (accented or unaccented).
        Returns medicine details and indicated diseases sorted by treatment line (First-line before Second-line).
        """
        if not self.kb_loader.is_loaded:
            self.kb_loader.load()

        clean_q = query.strip()
        if not clean_q:
            return MedicineSearchData(
                found=False,
                query="",
                message="Vui lòng nhập tên thuốc hoặc hoạt chất để tra cứu bệnh lý chỉ định.",
                medicine=None,
                totalDiseases=0,
                indicatedDiseases=[],
                suggestedMedicines=self.get_all_medicines()[:10],
            )

        clean_unacc = strip_accents(clean_q.lower())

        # 1. Match by Medicine ID directly
        matched_med: dict[str, Any] | None = (
            self.kb_loader.medicines_by_id.get(clean_q)
            or self.kb_loader.medicines_by_id.get(clean_q.lower())
        )

        # 2. Match exact name or active ingredient
        if not matched_med:
            for item in self.kb_loader.medicines_by_id.values():
                name_unacc = strip_accents(item["name"].lower())
                active_unacc = strip_accents(item.get("active_ingredient", "").lower())
                if clean_unacc == name_unacc or clean_unacc == active_unacc:
                    matched_med = item
                    break

        # 3. Fuzzy match using RapidFuzz
        if not matched_med:
            best_score = 0.0
            best_candidate = None
            for item in self.kb_loader.medicines_by_id.values():
                name_unacc = strip_accents(item["name"].lower())
                active_unacc = strip_accents(item.get("active_ingredient", "").lower())
                score = max(
                    fuzz.token_set_ratio(clean_unacc, name_unacc),
                    fuzz.token_set_ratio(clean_unacc, active_unacc),
                )
                if score > best_score:
                    best_score = score
                    best_candidate = item
            if best_score >= 80.0 and best_candidate:
                matched_med = best_candidate

        # 4. Fallback substring matching
        if not matched_med:
            for item in self.kb_loader.medicines_by_id.values():
                name_unacc = strip_accents(item["name"].lower())
                active_unacc = strip_accents(item.get("active_ingredient", "").lower())
                if clean_unacc in name_unacc or clean_unacc in active_unacc or name_unacc in clean_unacc:
                    matched_med = item
                    break

        # Suggestions for similar medicines
        suggested: list[tuple[float, dict[str, str]]] = []
        for item in self.kb_loader.medicines_by_id.values():
            if matched_med and item["id"] == matched_med["id"]:
                continue
            name_unacc = strip_accents(item["name"].lower())
            active_unacc = strip_accents(item.get("active_ingredient", "").lower())
            score = max(
                fuzz.token_set_ratio(clean_unacc, name_unacc),
                fuzz.token_set_ratio(clean_unacc, active_unacc),
            )
            is_sub = (clean_unacc in name_unacc) or (clean_unacc in active_unacc)
            if is_sub or score >= 50:
                suggested.append(
                    (
                        score + (30 if is_sub else 0),
                        {
                            "id": item["id"],
                            "name": item["name"],
                            "activeIngredient": item.get("active_ingredient", ""),
                            "group": item.get("group", ""),
                        },
                    )
                )

        suggested.sort(key=lambda x: x[0], reverse=True)
        suggested_meds = [s[1] for s in suggested[:8]]

        if not matched_med:
            return MedicineSearchData(
                found=False,
                query=clean_q,
                message=f"Không tìm thấy thuốc hoặc hoạt chất phù hợp với từ khóa '{clean_q}'. Quý bác sĩ/người dùng có thể chọn các gợi ý bên dưới.",
                medicine=None,
                totalDiseases=0,
                indicatedDiseases=[],
                suggestedMedicines=suggested_meds or self.get_all_medicines()[:8],
            )

        med_detail = MedicineDetailSearchItem(
            id=matched_med["id"],
            name=matched_med["name"],
            activeIngredient=matched_med.get("active_ingredient", ""),
            group=matched_med.get("group", ""),
            usage=matched_med.get("usage", ""),
            dosage=matched_med.get("dosage", ""),
            instruction=matched_med.get("instruction", ""),
            prescriptionRequired=matched_med.get("prescription_required", True),
            contraindications=matched_med.get("contraindications", []),
        )

        # Find all diseases linked to this medicine in disease_medicines
        m_id = matched_med["id"]
        indicated: list[MedicineDiseaseIndicationItem] = []

        for d_id, mappings in self.kb_loader.disease_medicines.items():
            for mapping in mappings:
                if mapping.get("medicine_id") == m_id:
                    dis_info = self.kb_loader.diseases_by_id.get(d_id)
                    if dis_info:
                        indicated.append(
                            MedicineDiseaseIndicationItem(
                                id=dis_info["id"],
                                name=dis_info["name_vi"],
                                name_en=dis_info.get("name_en", ""),
                                specialty=dis_info.get("specialty", "Nội khoa"),
                                description=dis_info.get("description", ""),
                                line=int(mapping.get("line", 1)),
                                weight=float(mapping.get("weight", 0.5)),
                                note=mapping.get("note", ""),
                            )
                        )

        # Sort indicated diseases: Line 1 first (line asc), then weight desc, then name
        indicated.sort(key=lambda x: (x.line, -x.weight, x.name))

        return MedicineSearchData(
            found=True,
            query=clean_q,
            message=f"Đã tìm thấy thuốc '{matched_med['name']}' được chỉ định điều trị cho {len(indicated)} bệnh lý.",
            medicine=med_detail,
            totalDiseases=len(indicated),
            indicatedDiseases=indicated,
            suggestedMedicines=suggested_meds,
        )
