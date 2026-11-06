"""Clinical safety and emergency red flag detection module.

Operates independently of the classifier to detect life-threatening clinical presentations.
Enforces non-affirmative phrasing and ensures mandatory medical disclaimers.
"""

import re

from drug_recommendation.nlp.normalizer import strip_accents

# Critical emergency red flag definitions with clinical action guidance
RED_FLAG_RULES = [
    {
        "id": "acute_coronary_syndrome",
        "keywords": [
            r"\bdau that nguc\b",
            r"\bnhoi mau co tim\b",
            r"\bdau nguc du doi\b",
            r"\bthat nguc\b",
            r"\bngung tim\b",
        ],
        "symptoms": ["chest_pain"],
        "message": "DẤU HIỆU NGUY CẤP: Nghi ngờ hội chứng mạch vành cấp / Nhồi máu cơ tim. Đề nghị đo ECG khẩn cấp và xử trí cấp cứu.",
    },
    {
        "id": "acute_stroke",
        "keywords": [
            r"\bliet nua nguoi\b",
            r"\bmeo mieng\b",
            r"\bnoi ngong\b",
            r"\bliu luoi\b",
            r"\bdot quy\b",
            r"\btay chan mot ben yeu\b",
        ],
        "symptoms": ["weakness_of_one_body_side", "slurred_speech"],
        "message": "DẤU HIỆU NGUY CẤP: Dấu hiệu cảnh báo đột quỵ não (FAST: méo miệng, yếu liệt chi, khó nói). Cần chuyển cấp cứu ngay.",
    },
    {
        "id": "respiratory_failure",
        "keywords": [
            r"\bkho tho du doi\b",
            r"\bngop tho\b",
            r"\bsuy ho hap\b",
            r"\btim tai\b",
            r"\btho rit\b",
        ],
        "symptoms": ["breathlessness"],
        "message": "DẤU HIỆU NGUY CẤP: Suy hô hấp nặng hoặc tắc nghẽn đường thở. Cần kiểm tra SpO2 và hỗ trợ hô hấp khẩn cấp.",
    },
    {
        "id": "gi_bleeding",
        "keywords": [
            r"\bnon ra mau\b",
            r"\bxuat huyet da day\b",
            r"\bphan den\b",
            r"\bchay mau bao tu\b",
        ],
        "symptoms": ["stomach_bleeding"],
        "message": "DẤU HIỆU NGUY CẤP: Nghi ngờ xuất huyết tiêu hóa trên cấp tính. Cần theo dõi huyết động và chuẩn bị nội soi can thiệp.",
    },
    {
        "id": "coma_altered_mental",
        "keywords": [
            r"\bhon me\b",
            r"\bbat tinh\b",
            r"\bngat xiu\b",
            r"\bme sang\b",
            r"\bkhong tinh tao\b",
        ],
        "symptoms": ["coma", "altered_sensorium"],
        "message": "DẤU HIỆU NGUY CẤP: Hôn mê hoặc rối loạn tri giác sâu. Cần đánh giá thang điểm Glasgow và bảo vệ đường thở.",
    },
    {
        "id": "meningitis_stiff_neck",
        "keywords": [
            r"\bcung gay\b",
            r"\bsot cao cung gay\b",
            r"\bcung co kem sot\b",
        ],
        "symptoms": ["stiff_neck"],
        "message": "DẤU HIỆU NGUY CẤP: Nghi ngờ hội chứng màng não (sốt cao kèm cứng gáy). Cần chọc dò tủy sống loại trừ viêm màng não.",
    },
    {
        "id": "pediatric_seizure",
        "keywords": [
            r"\bco giat\b",
            r"\bsot co giat\b",
            r"\bdong kinh\b",
            r"\bsot cao co giat\b",
        ],
        "symptoms": [],
        "message": "DẤU HIỆU NGUY CẤP: Co giật hoặc sốt cao co giật. Cần hạ sốt, chống co giật và bảo vệ đường thở khẩn cấp.",
    },
]

MANDATORY_DISCLAIMER = "Kết quả chỉ mang tính tham khảo, không thay thế chẩn đoán của bác sĩ."


class SafetyChecker:
    """Evaluates input text and extracted symptoms for emergency clinical red flags."""

    @staticmethod
    def check_red_flags(
        raw_text: str, recognized_symptoms: list[str] | None = None
    ) -> list[str]:
        """Check both text patterns and recognized symptom codes for emergency red flags."""
        if recognized_symptoms is None:
            recognized_symptoms = []

        unaccented_text = strip_accents(raw_text.lower())
        detected_flags: list[str] = []
        seen_rules: set[str] = set()

        for rule in RED_FLAG_RULES:
            rule_id = str(rule["id"])
            if rule_id in seen_rules:
                continue

            # Check text regex patterns
            triggered = False
            keywords = rule["keywords"]
            if isinstance(keywords, list):
                for pat in keywords:
                    if re.search(str(pat), unaccented_text):
                        triggered = True
                        break

            # Check canonical symptom IDs if text didn't trigger
            symptoms = rule["symptoms"]
            if not triggered and isinstance(symptoms, list):
                for sym_id in symptoms:
                    if str(sym_id) in recognized_symptoms:
                        triggered = True
                        break

            if triggered:
                seen_rules.add(rule_id)
                detected_flags.append(str(rule["message"]))

        return detected_flags


safety_checker = SafetyChecker()
