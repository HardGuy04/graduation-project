"""Lightweight fixtures for CI and offline unit testing.

Contains 5 diseases, 20 symptoms, ~150 samples and minimal KB data
so tests never depend on the full dataset or large external artifacts.
"""

from typing import Any

import numpy as np
import pandas as pd

FIXTURE_DISEASES = [
    {
        "id": "viem_hong",
        "name_vi": "Viêm họng cấp",
        "name_en": "Acute Pharyngitis",
        "specialty": "Tai Mũi Họng",
        "description": "Viêm niêm mạc vùng hầu họng cấp tính",
        "aliases": "viem hong;dau hong;rát hong",
        "red_flag": "false",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "cum_mua",
        "name_vi": "Cảm cúm thông thường",
        "name_en": "Common Cold",
        "specialty": "Tai Mũi Họng",
        "description": "Nhiễm siêu vi đường hô hấp trên",
        "aliases": "cam cum;cam lanh;so mui",
        "red_flag": "false",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "viem_da_di_ung",
        "name_vi": "Viêm da dị ứng",
        "name_en": "Allergic Dermatitis",
        "specialty": "Da liễu",
        "description": "Phản ứng viêm da dị ứng ngứa ngáy",
        "aliases": "viem da di ung;di ung da;man ngua",
        "red_flag": "false",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "tang_huyet_ap",
        "name_vi": "Tăng huyết áp",
        "name_en": "Hypertension",
        "specialty": "Tim mạch",
        "description": "Áp lực máu trong động mạch tăng cao",
        "aliases": "tang huyet ap;cao huyet ap",
        "red_flag": "false",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "thoai_hoa_khop",
        "name_vi": "Thoái hóa khớp",
        "name_en": "Osteoarthritis",
        "specialty": "Cơ xương khớp",
        "description": "Tổn thương sụn và xương dưới sụn khớp",
        "aliases": "thoai hoa khop;dau khop",
        "red_flag": "false",
        "source": "fixture",
        "reviewed": "true",
    },
]

FIXTURE_SYMPTOMS = [
    ("dau_hong", "đau họng", "sore throat", "Mắt - TMH", 4, "dau hong;rát hong;dau co hong"),
    ("sot", "sốt", "fever", "Toàn thân", 5, "sot;sot nhe;sot cao;nong dau"),
    ("ho_khan", "ho khan", "dry cough", "Hô hấp", 4, "ho khan;ho gio;ho"),
    (
        "chay_nuoc_mui",
        "chảy nước mũi",
        "runny nose",
        "Mắt - TMH",
        3,
        "chay nuoc mui;so mui;chay mui",
    ),
    ("nghet_mui", "nghẹt mũi", "nasal congestion", "Mắt - TMH", 3, "nghet mui;ngat mui;tac mui"),
    ("ngua_da", "ngứa da", "itching", "Da liễu", 2, "ngua;ngua da;ngua ngay"),
    ("phat_ban", "phát ban ngoài da", "skin rash", "Da liễu", 3, "phat ban;man do;noi ban"),
    ("dau_dau", "đau đầu", "headache", "Thần kinh", 3, "dau dau;nhuc dau;choang"),
    ("chong_mat", "chóng mặt", "dizziness", "Thần kinh", 4, "chong mat;hoa mat;xay xam"),
    ("dau_nguc", "đau tức ngực", "chest pain", "Tim mạch", 7, "dau nguc;tuc nguc;dau that nguc"),
    ("dau_khop", "đau khớp", "joint pain", "Cơ xương khớp", 3, "dau khop;moi khop;nhuc khop"),
    (
        "cung_khop",
        "cứng khớp buổi sáng",
        "joint stiffness",
        "Cơ xương khớp",
        4,
        "cung khop;kho cu dong",
    ),
    ("kho_tho", "khó thở", "breathlessness", "Hô hấp", 6, "kho tho;tho gap;hut hoi"),
    ("met_moi", "mệt mỏi", "fatigue", "Toàn thân", 3, "met;met moi;u oai"),
    ("o_chua", "ợ chua nóng rát", "acidity", "Tiêu hóa", 3, "o chua;nong rat;chua mieng"),
    ("buon_non", "buồn nôn", "nausea", "Tiêu hóa", 3, "buon non;mac oi;nôn nao"),
    (
        "tieu_buot",
        "tiểu buốt rát",
        "burning micturition",
        "Thận - Tiết niệu",
        5,
        "tieu buot;tieu rat;dai buot",
    ),
    ("sut_can", "sụt cân nhanh", "weight loss", "Toàn thân", 4, "sut can;giam can;gay di"),
    ("lanh_tay_chan", "lạnh chân tay", "cold limbs", "Toàn thân", 3, "lanh tay chan;tay chan buot"),
    ("kho_ngu", "khó ngủ mất ngủ", "insomnia", "Thần kinh", 3, "kho ngu;mat ngu;ngu chap chon"),
]

FIXTURE_MEDICINES = [
    {
        "id": "med_paracetamol",
        "name": "Paracetamol 500mg",
        "active_ingredient": "Paracetamol",
        "group": "Hạ sốt giảm đau",
        "usage": "Hạ sốt, giảm triệu chứng đau họng, nhức đầu mức độ nhẹ đến trung bình.",
        "prescription_required": "false",
        "contraindications": "suy gan nang",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "med_amoxicillin",
        "name": "Amoxicillin 500mg",
        "active_ingredient": "Amoxicillin",
        "group": "Kháng sinh nhóm Penicillin",
        "usage": "Điều trị nhiễm khuẩn hô hấp trên do vi khuẩn nhạy cảm.",
        "prescription_required": "true",
        "contraindications": "penicillin;amoxicillin;di ung khang sinh",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "med_loratadine",
        "name": "Loratadine 10mg",
        "active_ingredient": "Loratadine",
        "group": "Kháng histamin H1",
        "usage": "Giảm triệu chứng dị ứng, ngứa da, phát ban, chảy nước mũi.",
        "prescription_required": "false",
        "contraindications": "",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "med_amlodipine",
        "name": "Amlodipine 5mg",
        "active_ingredient": "Amlodipine",
        "group": "Thuốc chẹn kênh canxi",
        "usage": "Kiểm soát huyết áp trong điều trị tăng huyết áp.",
        "prescription_required": "true",
        "contraindications": "huyet ap thap",
        "source": "fixture",
        "reviewed": "true",
    },
    {
        "id": "med_meloxicam",
        "name": "Meloxicam 7.5mg",
        "active_ingredient": "Meloxicam",
        "group": "NSAID kháng viêm",
        "usage": "Giảm đau chống viêm trong thoái hóa khớp.",
        "prescription_required": "true",
        "contraindications": "nsaid;aspirin;loet da day ta trang;suy than",
        "source": "fixture",
        "reviewed": "true",
    },
]

FIXTURE_DISEASE_MEDICINE = [
    ("viem_hong", "med_paracetamol", 0.95, 1, "Thuốc hạ sốt giảm đau đầu tay"),
    ("viem_hong", "med_amoxicillin", 0.85, 2, "Kháng sinh khi nghi nhiễm khuẩn"),
    ("cum_mua", "med_paracetamol", 0.90, 1, "Hạ sốt giảm đau nhức toàn thân"),
    ("cum_mua", "med_loratadine", 0.75, 2, "Giảm chảy nước mũi hắt hơi"),
    ("viem_da_di_ung", "med_loratadine", 0.95, 1, "Kháng dị ứng giảm ngứa"),
    ("tang_huyet_ap", "med_amlodipine", 0.95, 1, "Hạ áp kiểm soát tim mạch"),
    ("thoai_hoa_khop", "med_meloxicam", 0.90, 1, "Kháng viêm giảm đau khớp"),
]


def generate_mini_dataset(num_samples: int = 150, random_state: int = 42) -> pd.DataFrame:
    """Generate deterministic mini DataFrame matching fixture definitions."""
    rng = np.random.default_rng(random_state)
    symptom_cols = [s[0] for s in FIXTURE_SYMPTOMS]

    # Archetype symptoms per disease
    archetypes = {
        "viem_hong": ["dau_hong", "sot", "ho_khan", "met_moi"],
        "cum_mua": ["sot", "ho_khan", "chay_nuoc_mui", "nghet_mui", "dau_dau"],
        "viem_da_di_ung": ["ngua_da", "phat_ban"],
        "tang_huyet_ap": ["dau_dau", "chong_mat", "dau_nguc"],
        "thoai_hoa_khop": ["dau_khop", "cung_khop", "met_moi"],
    }

    rows: list[dict[str, Any]] = []
    samples_per_class = num_samples // len(archetypes)

    for dis_id, arch in archetypes.items():
        for _ in range(samples_per_class):
            row = {c: 0 for c in symptom_cols}
            # Active archetypes with small dropout
            for a in arch:
                if rng.random() > 0.15:
                    row[a] = 1
            # Ensure at least 1 symptom is on
            if sum(row.values()) == 0:
                row[arch[0]] = 1
            # Random noise symptom
            if rng.random() < 0.25:
                noise_col = rng.choice([c for c in symptom_cols if c not in arch])
                row[noise_col] = 1

            row["prognosis"] = dis_id
            rows.append(row)

    df = pd.DataFrame(rows)
    return df
