"""Knowledge Base Generator Script for AI_SERVICE.

Extracts data from dataset/ and generates normalized, clinical-standard CSVs in data/kb/:
- diseases.csv
- symptoms.csv
- symptom_map_vi.csv
- medicines.csv
- disease_medicine.csv
"""

import ast
import csv
import json
import logging
import sys
from pathlib import Path
from typing import Any

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

import pandas as pd  # noqa: E402

from drug_recommendation.config import settings  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s]: %(message)s")
logger = logging.getLogger("generate_kb")


def disease_to_id(name: str) -> str:
    """Convert raw disease name to canonical snake_case ID."""
    clean = name.strip().lower()
    for ch in ["(", ")", "[", "]", "{", "}", ",", ".", "/", "-", "'"]:
        clean = clean.replace(ch, " ")
    clean = " ".join(clean.split())
    clean = clean.replace(" ", "_")
    return clean


def normalize_symptom(s: str) -> str:
    """Normalize raw symptom column to snake_case."""
    clean = s.strip().lower()
    for ch in ["(", ")", "[", "]", "{", "}", ",", ".", "'"]:
        clean = clean.replace(ch, "_")
    clean = clean.replace(" ", "_")
    while "__" in clean:
        clean = clean.replace("__", "_")
    return clean.strip("_")


# Complete Vietnamese translation and clinical metadata for all 41 diseases
DISEASE_METADATA: dict[str, dict[str, str | bool]] = {
    "(vertigo) Paroymsal  Positional Vertigo": {
        "id": "vertigo_paroxysmal_positional_vertigo",
        "name_vi": "Chóng mặt kịch phát tư thế lành tính (BPPV)",
        "specialty": "Tai Mũi Họng",
        "aliases": "chong mat tien dinh;bppv;chong mat tu the;roi loan tien dinh",
        "red_flag": False,
    },
    "AIDS": {
        "id": "aids",
        "name_vi": "Hội chứng suy giảm miễn dịch mắc phải (AIDS)",
        "specialty": "Nội tổng quát",
        "aliases": "hiv;nhiem hiv;aids;suy giam mien dich",
        "red_flag": False,
    },
    "Acne": {
        "id": "acne",
        "name_vi": "Mụn trứng cá",
        "specialty": "Da liễu",
        "aliases": "mun trung ca;mun bọc;mun viem;acne",
        "red_flag": False,
    },
    "Alcoholic hepatitis": {
        "id": "alcoholic_hepatitis",
        "name_vi": "Viêm gan do rượu",
        "specialty": "Nội tổng quát",
        "aliases": "viem gan ruou;ton thuong gan do ruou;gan nhiem mo do ruou",
        "red_flag": False,
    },
    "Allergy": {
        "id": "allergy",
        "name_vi": "Dị ứng",
        "specialty": "Nội tổng quát",
        "aliases": "di ung;di ung thoi tiet;phat ban di ung;viem mui di ung",
        "red_flag": False,
    },
    "Arthritis": {
        "id": "arthritis",
        "name_vi": "Viêm khớp",
        "specialty": "Cơ xương khớp",
        "aliases": "viem khop;dau khop;dau nhuc khop;sung khop",
        "red_flag": False,
    },
    "Bronchial Asthma": {
        "id": "bronchial_asthma",
        "name_vi": "Hen phế quản (Suyễn)",
        "specialty": "Nội tổng quát",
        "aliases": "hen suyên;hen phe quan;suyen;kho khe;asthma",
        "red_flag": False,
    },
    "Cervical spondylosis": {
        "id": "cervical_spondylosis",
        "name_vi": "Thoái hóa cột sống cổ",
        "specialty": "Cơ xương khớp",
        "aliases": "thoai hoa cot song co;thoai hoa co;dau moi co vai gay;dau dot song co",
        "red_flag": False,
    },
    "Chicken pox": {
        "id": "chicken_pox",
        "name_vi": "Bệnh thủy đậu",
        "specialty": "Da liễu",
        "aliases": "thuy dau;bong nuoc thuy dau;dau mua;chickenpox",
        "red_flag": False,
    },
    "Chronic cholestasis": {
        "id": "chronic_cholestasis",
        "name_vi": "Ứ mật mạn tính",
        "specialty": "Nội tổng quát",
        "aliases": "u mat;tac mat man tinh;vang da u mat;cholestasis",
        "red_flag": False,
    },
    "Common Cold": {
        "id": "common_cold",
        "name_vi": "Cảm lạnh thông thường",
        "specialty": "Tai Mũi Họng",
        "aliases": "cam lanh;cam cum;so mui;nghet mui;cam mao",
        "red_flag": False,
    },
    "Dengue": {
        "id": "dengue",
        "name_vi": "Sốt xuất huyết Dengue",
        "specialty": "Nội tổng quát",
        "aliases": "sot xuat huyet;sot dengue;xuat huyet duoi da",
        "red_flag": False,
    },
    "Diabetes ": {
        "id": "diabetes",
        "name_vi": "Đái tháo đường (Tiểu đường)",
        "specialty": "Nội tổng quát",
        "aliases": "tieu duong;dai thao duong;duong huyet cao;dai thao duong type 2",
        "red_flag": False,
    },
    "Dimorphic hemmorhoids(piles)": {
        "id": "dimorphic_hemmorhoids_piles",
        "name_vi": "Bệnh trĩ hỗn hợp",
        "specialty": "Nội tổng quát",
        "aliases": "benh tri;tri noi;tri ngoai;tri hon hop;di ngoai ra mau",
        "red_flag": False,
    },
    "Drug Reaction": {
        "id": "drug_reaction",
        "name_vi": "Phản ứng có hại của thuốc thể da (Dị ứng thuốc)",
        "specialty": "Da liễu",
        "aliases": "di ung thuoc;phan ung thuoc;phat ban do thuoc;say thuoc",
        "red_flag": False,
    },
    "Fungal infection": {
        "id": "fungal_infection",
        "name_vi": "Nhiễm nấm da",
        "specialty": "Da liễu",
        "aliases": "nam da;hac lao;lang ben;nam nong;nhiem nam",
        "red_flag": False,
    },
    "GERD": {
        "id": "gerd",
        "name_vi": "Trào ngược dạ dày thực quản (GERD)",
        "specialty": "Nội tổng quát",
        "aliases": "trao nguoc da day;o nong;o chua;viem thuc quan;gerd",
        "red_flag": False,
    },
    "Gastroenteritis": {
        "id": "gastroenteritis",
        "name_vi": "Viêm dạ dày ruột cấp",
        "specialty": "Nội tổng quát",
        "aliases": "viem ruot;viem da day ruot;roi loan tieu hoa;tieu chay non mua",
        "red_flag": False,
    },
    "Heart attack": {
        "id": "heart_attack",
        "name_vi": "Nhồi máu cơ tim cấp",
        "specialty": "Tim mạch",
        "aliases": "nhoi mau co tim;dot quy tim;dau nguc du doi;ngung tim",
        "red_flag": True,
    },
    "Hepatitis B": {
        "id": "hepatitis_b",
        "name_vi": "Viêm gan siêu vi B",
        "specialty": "Nội tổng quát",
        "aliases": "viem gan b;nhiem virus viem gan b;hbv",
        "red_flag": False,
    },
    "Hepatitis C": {
        "id": "hepatitis_c",
        "name_vi": "Viêm gan siêu vi C",
        "specialty": "Nội tổng quát",
        "aliases": "viem gan c;nhiem virus viem gan c;hcv",
        "red_flag": False,
    },
    "Hepatitis D": {
        "id": "hepatitis_d",
        "name_vi": "Viêm gan siêu vi D",
        "specialty": "Nội tổng quát",
        "aliases": "viem gan d;hdv",
        "red_flag": False,
    },
    "Hepatitis E": {
        "id": "hepatitis_e",
        "name_vi": "Viêm gan siêu vi E",
        "specialty": "Nội tổng quát",
        "aliases": "viem gan e;hev",
        "red_flag": False,
    },
    "Hypertension ": {
        "id": "hypertension",
        "name_vi": "Tăng huyết áp",
        "specialty": "Tim mạch",
        "aliases": "tang huyet ap;cao huyet ap;huyet ap cao",
        "red_flag": False,
    },
    "Hyperthyroidism": {
        "id": "hyperthyroidism",
        "name_vi": "Cường giáp (Bệnh Basedow)",
        "specialty": "Nội tổng quát",
        "aliases": "cuong giap;basedow;tuyen giap hoat dong qua muc",
        "red_flag": False,
    },
    "Hypoglycemia": {
        "id": "hypoglycemia",
        "name_vi": "Hạ đường huyết cấp",
        "specialty": "Nội tổng quát",
        "aliases": "ha duong huyet;tut duong huyet;ha duong mau",
        "red_flag": False,
    },
    "Hypothyroidism": {
        "id": "hypothyroidism",
        "name_vi": "Suy giáp",
        "specialty": "Nội tổng quát",
        "aliases": "suy giap;suy giap trang;tuyen giap kem hoat dong",
        "red_flag": False,
    },
    "Impetigo": {
        "id": "impetigo",
        "name_vi": "Bệnh chốc lở",
        "specialty": "Da liễu",
        "aliases": "choc lo;choc lo ngoai da;viem da mu;impetigo",
        "red_flag": False,
    },
    "Jaundice": {
        "id": "jaundice",
        "name_vi": "Hội chứng vàng da",
        "specialty": "Nội tổng quát",
        "aliases": "vang da;vang mat;benh vang da;tang bilirubin",
        "red_flag": False,
    },
    "Malaria": {
        "id": "malaria",
        "name_vi": "Bệnh sốt rét",
        "specialty": "Nội tổng quát",
        "aliases": "sot ret;sot ret run;nhiem ky sinh trung sot ret",
        "red_flag": False,
    },
    "Migraine": {
        "id": "migraine",
        "name_vi": "Đau nửa đầu Migraine",
        "specialty": "Nội tổng quát",
        "aliases": "dau nua dau;migraine;dau dau van mach;dau nua dau ben trai;dau nua dau ben phai",
        "red_flag": False,
    },
    "Osteoarthristis": {
        "id": "osteoarthritis",
        "name_vi": "Thoái hóa khớp",
        "specialty": "Cơ xương khớp",
        "aliases": "thoai hoa khop;thoai hoa khop goi;dau khop thoai hoa",
        "red_flag": False,
    },
    "Paralysis (brain hemorrhage)": {
        "id": "paralysis_brain_hemorrhage",
        "name_vi": "Liệt do xuất huyết não (Đột quỵ não)",
        "specialty": "Tim mạch",
        "aliases": "dot quy;tai bien mach mau nao;xuat huyet nao;liet nua nguoi;meo mieng",
        "red_flag": True,
    },
    "Peptic ulcer diseae": {
        "id": "peptic_ulcer_disease",
        "name_vi": "Loét dạ dày tá tràng",
        "specialty": "Nội tổng quát",
        "aliases": "loet da day;dau da day;viem loet da day ta trang;dau thuong vi",
        "red_flag": False,
    },
    "Pneumonia": {
        "id": "pneumonia",
        "name_vi": "Viêm phổi",
        "specialty": "Nội tổng quát",
        "aliases": "viem phoi;nhiem trung phoi;viem phe quan phoi",
        "red_flag": False,
    },
    "Psoriasis": {
        "id": "psoriasis",
        "name_vi": "Bệnh vảy nến",
        "specialty": "Da liễu",
        "aliases": "vay nen;vay nen the mang;bong da vay nen",
        "red_flag": False,
    },
    "Tuberculosis": {
        "id": "tuberculosis",
        "name_vi": "Lao phổi",
        "specialty": "Nội tổng quát",
        "aliases": "lao phoi;benh lao;ho ra mau do lao",
        "red_flag": False,
    },
    "Typhoid": {
        "id": "typhoid",
        "name_vi": "Sốt thương hàn",
        "specialty": "Nội tổng quát",
        "aliases": "sot thuong han;thuong han;nhiem salmonella",
        "red_flag": False,
    },
    "Urinary tract infection": {
        "id": "urinary_tract_infection",
        "name_vi": "Nhiễm trùng đường tiết niệu",
        "specialty": "Nội tổng quát",
        "aliases": "nhiem trung duong tieu;viem duong tiet nieu;tieu buot;tieu rat;uti",
        "red_flag": False,
    },
    "Varicose veins": {
        "id": "varicose_veins",
        "name_vi": "Suy giãn tĩnh mạch chi dưới",
        "specialty": "Tim mạch",
        "aliases": "suy gian tinh mach;gian tinh mach chan;phu chan;noi gan xanh",
        "red_flag": False,
    },
    "hepatitis A": {
        "id": "hepatitis_a",
        "name_vi": "Viêm gan siêu vi A",
        "specialty": "Nội tổng quát",
        "aliases": "viem gan a;hav;nhiem virus viem gan a",
        "red_flag": False,
    },
}

# Translation dictionary for 132 raw symptoms to Vietnamese with aliases
SYMPTOM_TRANSLATIONS: dict[str, dict[str, str]] = {
    "itching": {
        "vi": "ngứa da",
        "cat": "Da liễu",
        "aliases": "ngua;ngua ngay;ngua da;ngua khap nguoi",
    },
    "skin_rash": {
        "vi": "phát ban ngoài da",
        "cat": "Da liễu",
        "aliases": "phat ban;noi man do;noi ban;man do",
    },
    "nodal_skin_eruptions": {
        "vi": "nổi nốt cục sần trên da",
        "cat": "Da liễu",
        "aliases": "noi cuc san;man ngua dang cuc;not tren da;mun san",
    },
    "continuous_sneezing": {
        "vi": "hắt hơi liên tục",
        "cat": "Hô hấp",
        "aliases": "hat hoi;hat xi;hat xi lien tuc;nhay mui",
    },
    "shivering": {
        "vi": "run rẩy rùng mình",
        "cat": "Toàn thân",
        "aliases": "run;run ray;rung minh;lanh run",
    },
    "chills": {
        "vi": "ớn lạnh",
        "cat": "Toàn thân",
        "aliases": "on lanh;cam giac lanh;on lanh so gio;so lanh",
    },
    "joint_pain": {
        "vi": "đau nhức khớp",
        "cat": "Cơ xương khớp",
        "aliases": "dau khop;dau nhuc khop;moi khop;nhuc khop",
    },
    "stomach_pain": {
        "vi": "đau dạ dày (đau bụng trên)",
        "cat": "Tiêu hóa",
        "aliases": "dau da day;dau bao tu;dau bung tren;dau thuong vi",
    },
    "acidity": {
        "vi": "chua miệng (ợ chua dư axit)",
        "cat": "Tiêu hóa",
        "aliases": "o chua;du axit;chua mieng;nong rat da day",
    },
    "ulcers_on_tongue": {
        "vi": "lở loét trên lưỡi",
        "cat": "Mắt - TMH",
        "aliases": "nhiet luoi;lo luoi;lo mieng;vet lo tren luoi",
    },
    "muscle_wasting": {
        "vi": "teo cơ (teo nhược cơ)",
        "cat": "Cơ xương khớp",
        "aliases": "teo co;teo bắp thit;yeu co teo co",
    },
    "vomiting": {
        "vi": "nôn mửa",
        "cat": "Tiêu hóa",
        "aliases": "non;non mua;oi;buon non non ra ngoai",
    },
    "burning_micturition": {
        "vi": "tiểu buốt (tiểu rát nóng)",
        "cat": "Thận - Tiết niệu",
        "aliases": "tieu buot;tieu rat;dai buot;dai dat;nong rat khi di tieu",
    },
    "spotting_urination": {
        "vi": "tiểu nhỏ giọt (tiểu ngắt quãng)",
        "cat": "Thận - Tiết niệu",
        "aliases": "tieu nho giot;dai nho giot;tieu khong het;ngat quang khi tieu",
    },
    "fatigue": {
        "vi": "mệt mỏi kiệt sức",
        "cat": "Toàn thân",
        "aliases": "met;met moi;u oai;met moi kiẹt suc;suy nhuoc",
    },
    "weight_gain": {
        "vi": "tăng cân bất thường",
        "cat": "Toàn thân",
        "aliases": "tang can;tang can nhanh;beo len bat thuong",
    },
    "anxiety": {
        "vi": "lo âu bồn chồn",
        "cat": "Thần kinh",
        "aliases": "lo au;bon chon;lo lang;bat an",
    },
    "cold_hands_and_feets": {
        "vi": "chân tay lạnh buốt",
        "cat": "Toàn thân",
        "aliases": "tay chan lanh;lanh tay chan;tay chan buot lanh",
    },
    "mood_swings": {
        "vi": "thay đổi tâm trạng thất thường",
        "cat": "Thần kinh",
        "aliases": "thay doi tam trang;that thuong;de ca khao;tam trang thay doi",
    },
    "weight_loss": {
        "vi": "sụt cân (giảm cân nhanh)",
        "cat": "Toàn thân",
        "aliases": "sut can;giam can;sut can nhanh;gay di",
    },
    "restlessness": {
        "vi": "bứt rứt không yên",
        "cat": "Thần kinh",
        "aliases": "but rut;kho chiu;khong yen;bon chon kho chiu",
    },
    "lethargy": {
        "vi": "lờ đờ uể oải",
        "cat": "Thần kinh",
        "aliases": "lo do;u oai;thieu suc song;ngu li bi",
    },
    "patches_in_throat": {
        "vi": "đốm mảng trắng trong họng",
        "cat": "Mắt - TMH",
        "aliases": "mang trang o hong;dom hong;lo loet hong;mang trang amidan",
    },
    "irregular_sugar_level": {
        "vi": "đường huyết dao động thất thường",
        "cat": "Toàn thân",
        "aliases": "duong huyet that thuong;duong mau dao dong;duong huyet cao",
    },
    "cough": {"vi": "ho", "cat": "Hô hấp", "aliases": "ho;ho gio;ho khan;ho co dom;con ho"},
    "high_fever": {
        "vi": "sốt cao",
        "cat": "Toàn thân",
        "aliases": "sot;bi sot;sot cao;sot nong;nhiet do cao;sot tren 38 do;sot cao lien tuc",
    },
    "sunken_eyes": {
        "vi": "mắt trũng sâu (dấu hiệu mất nước)",
        "cat": "Mắt - TMH",
        "aliases": "mat trung;mat sau;hoc mat trung sau",
    },
    "breathlessness": {
        "vi": "khó thở (hụt hơi)",
        "cat": "Hô hấp",
        "aliases": "kho tho;hut hoi;tho doc;tho gap;ngop tho",
    },
    "sweating": {
        "vi": "đổ mồ hôi nhiều",
        "cat": "Toàn thân",
        "aliases": "do mo hoi;mo hoi trom;va mo hoi;ra mo hoi nhieu",
    },
    "dehydration": {
        "vi": "mất nước",
        "cat": "Toàn thân",
        "aliases": "mat nuoc;khat nuoc lien tuc;kho mieng mat nuoc",
    },
    "indigestion": {
        "vi": "khó tiêu (đầy hơi chướng bụng)",
        "cat": "Tiêu hóa",
        "aliases": "kho tieu;day bung;an khong tieu;chuong bung",
    },
    "headache": {
        "vi": "đau đầu (nhức đầu)",
        "cat": "Thần kinh",
        "aliases": "dau dau;nhuc dau;dau buot dau;dau nua dau;dau dau am i",
    },
    "yellowish_skin": {
        "vi": "da vàng (vàng da)",
        "cat": "Da liễu",
        "aliases": "da vang;vang da;da vang vot;da sam vang",
    },
    "dark_urine": {
        "vi": "nước tiểu sẫm màu (nước tiểu sậm)",
        "cat": "Thận - Tiết niệu",
        "aliases": "nuoc tieu sam;nuoc tieu vang dam;nuoc tieu mau tra dac;nuoc tieu den",
    },
    "nausea": {"vi": "buồn nôn", "cat": "Tiêu hóa", "aliases": "buon non;mac oi;nôn nao;buon oi"},
    "loss_of_appetite": {
        "vi": "chán ăn (ăn không ngon)",
        "cat": "Tiêu hóa",
        "aliases": "chan an;an khong ngon;khong muon an;bieng an",
    },
    "pain_behind_the_eyes": {
        "vi": "đau nhức sau hốc mắt",
        "cat": "Mắt - TMH",
        "aliases": "dau sau hoc mat;nhuc sau mat;dau hoc mat;nhuc mat",
    },
    "back_pain": {
        "vi": "đau lưng",
        "cat": "Cơ xương khớp",
        "aliases": "dau lung;nhuc lung;moi lung;dau cot song lung",
    },
    "constipation": {
        "vi": "táo bón",
        "cat": "Tiêu hóa",
        "aliases": "tao bon;kho di cau;bon;khong di ngoai duoc",
    },
    "abdominal_pain": {
        "vi": "đau quặn bụng",
        "cat": "Tiêu hóa",
        "aliases": "dau bung;dau quan bung;dau bung duoi;dau bung quanh ron",
    },
    "diarrhoea": {
        "vi": "tiêu chảy (đi ngoài phân lỏng)",
        "cat": "Tiêu hóa",
        "aliases": "tieu chay;di ngoai;di ngoai phan long;tao thao duoi;di tieu long",
    },
    "mild_fever": {
        "vi": "sốt nhẹ",
        "cat": "Toàn thân",
        "aliases": "sot nhe;ham hap sot;am dau;nhiet do hoi cao",
    },
    "yellow_urine": {
        "vi": "nước tiểu màu vàng đục",
        "cat": "Thận - Tiết niệu",
        "aliases": "nuoc tieu vang;nuoc tieu duc;dai vang",
    },
    "yellowing_of_eyes": {
        "vi": "vàng mắt (củng mạc mắt vàng)",
        "cat": "Mắt - TMH",
        "aliases": "vang mat;long trang vang;mat bi vang;cung mac vang",
    },
    "acute_liver_failure": {
        "vi": "suy gan cấp tính",
        "cat": "Tiêu hóa",
        "aliases": "suy gan;suy gan cap;nhiem doc gan",
    },
    "fluid_overload": {
        "vi": "ứ dịch phù nề toàn thân",
        "cat": "Toàn thân",
        "aliases": "u dich;phu toan than;tich nuoc;nang nguoi do phu",
    },
    "swelling_of_stomach": {
        "vi": "chướng bụng to (cổ trướng)",
        "cat": "Tiêu hóa",
        "aliases": "bung to;chuong to bung;co truong;bung phinh to",
    },
    "swelled_lymph_nodes": {
        "vi": "nổi hạch sưng to",
        "cat": "Toàn thân",
        "aliases": "noi hach;sung hach;hach co;hach ben;noi hach dau",
    },
    "malaise": {
        "vi": "khó chịu toàn thân (bứt rứt rã rời)",
        "cat": "Toàn thân",
        "aliases": "kho chiu toan than;ra roi;kho chiu trong nguoi;buc boi",
    },
    "blurred_and_distorted_vision": {
        "vi": "mắt nhìn mờ méo hình",
        "cat": "Mắt - TMH",
        "aliases": "nhin mo;mat mo;mo mat;nhin hinh meo mo;giam thi luc",
    },
    "phlegm": {
        "vi": "có đờm (khạc ra đờm)",
        "cat": "Hô hấp",
        "aliases": "dom;co dom;ho co dom;khac dom;dom dac",
    },
    "throat_irritation": {
        "vi": "ngứa rát cổ họng",
        "cat": "Mắt - TMH",
        "aliases": "rat hong;ngua hong;dau hong;vung hong kho chiu;rat co hong",
    },
    "redness_of_eyes": {
        "vi": "đỏ mắt (mắt đỏ ngầu)",
        "cat": "Mắt - TMH",
        "aliases": "do mat;mat do;sung mat;do long trang",
    },
    "sinus_pressure": {
        "vi": "áp lực xoang (căng tức vùng mặt xoang)",
        "cat": "Mắt - TMH",
        "aliases": "cang tuc xoang;dau xoang;nhuc vung tran mat;tuc vung xoang",
    },
    "runny_nose": {
        "vi": "chảy nước mũi",
        "cat": "Mắt - TMH",
        "aliases": "chay nuoc mui;so mui;chay mui;nuoc mui trong",
    },
    "congestion": {
        "vi": "nghẹt mũi (ngạt mũi)",
        "cat": "Mắt - TMH",
        "aliases": "nghet mui;ngat mui;kho tho do nghet mui;tac mui",
    },
    "chest_pain": {
        "vi": "đau tức ngực",
        "cat": "Tim mạch",
        "aliases": "dau nguc;tuc nguc;dau that nguc;nhoi nguc;dau tuc vung nguc",
    },
    "weakness_in_limbs": {
        "vi": "yếu liệt tay chân",
        "cat": "Cơ xương khớp",
        "aliases": "yeu tay chan;moi tay chan;yeu chi;tay chan khong co suc",
    },
    "fast_heart_rate": {
        "vi": "tim đập nhanh hồi hộp",
        "cat": "Tim mạch",
        "aliases": "tim dap nhanh;nhip tim nhanh;dap thinh thich;hoi hop",
    },
    "pain_during_bowel_movements": {
        "vi": "đau rát khi đi cầu",
        "cat": "Tiêu hóa",
        "aliases": "dau khi di cau;dau khi di ngoai;rat hau mon khi di cau",
    },
    "pain_in_anal_region": {
        "vi": "đau nhức vùng hậu môn",
        "cat": "Tiêu hóa",
        "aliases": "dau hau mon;nhuc vung hau mon;dau buot hau mon",
    },
    "bloody_stool": {
        "vi": "đi ngoài ra máu (phân có máu)",
        "cat": "Tiêu hóa",
        "aliases": "di ngoai ra mau;phan co mau;di cau ra mau;mau trong phan",
    },
    "irritation_in_anus": {
        "vi": "ngứa rát khó chịu ở hậu môn",
        "cat": "Tiêu hóa",
        "aliases": "ngua hau mon;rat hau mon;kho chiu o hau mon",
    },
    "neck_pain": {
        "vi": "đau mỏi cổ",
        "cat": "Cơ xương khớp",
        "aliases": "dau co;moi co;dau vai gay;cung co;dau co gay",
    },
    "dizziness": {
        "vi": "chóng mặt hoa mắt",
        "cat": "Thần kinh",
        "aliases": "chong mat;hoa mat;choang vang;chong mat xay xam",
    },
    "cramps": {
        "vi": "chuột rút (co cứng cơ)",
        "cat": "Cơ xương khớp",
        "aliases": "chuot rut;co rut co;co cung bap chan;vop be",
    },
    "bruising": {
        "vi": "vết bầm tím dưới da",
        "cat": "Da liễu",
        "aliases": "bam tim;xuat huyet duoi da;vet bam;bầm da",
    },
    "obesity": {
        "vi": "thừa cân béo phì",
        "cat": "Toàn thân",
        "aliases": "beo phi;thua can;qua can;bung to beo",
    },
    "swollen_legs": {
        "vi": "phù chân (sưng cẳng chân)",
        "cat": "Tim mạch",
        "aliases": "phu chan;sung chan;sung phu hai chan;phu mat ca chan",
    },
    "swollen_blood_vessels": {
        "vi": "nổi mạch máu ngoằn ngoèo",
        "cat": "Tim mạch",
        "aliases": "noi mach mau;gan xanh ngoan ngoeo;noi tinh mach;gian tinh mach",
    },
    "puffy_face_and_eyes": {
        "vi": "phù mặt và mí mắt",
        "cat": "Toàn thân",
        "aliases": "mat sung phu;phu mat;sung mi mat;mat hup",
    },
    "enlarged_thyroid": {
        "vi": "bướu cổ (tuyến giáp to)",
        "cat": "Nội tiết",
        "aliases": "buou co;tuyen giap to;sung o co;buou giap",
    },
    "brittle_nails": {
        "vi": "móng tay giòn dễ gãy",
        "cat": "Da liễu",
        "aliases": "mong gion;mong tay de gay;mong yeu;nứt mong",
    },
    "swollen_extremeties": {
        "vi": "sưng phù các đầu chi",
        "cat": "Toàn thân",
        "aliases": "phu dau chi;sung ngon tay;sung ngon chan;phu ban tay ban chan",
    },
    "excessive_hunger": {
        "vi": "mau đói (ăn nhiều nhanh đói)",
        "cat": "Tiêu hóa",
        "aliases": "nhanh doi;doi lien tuc;them an nhieu;an nhieu ma van doi",
    },
    "extra_marital_contacts": {
        "vi": "quan hệ tình dục không an toàn ngoài luồng",
        "cat": "Toàn thân",
        "aliases": "quan he ngoai luong;quan he khong an toan;tinh duc khong bao ve",
    },
    "drying_and_tingling_lips": {
        "vi": "môi khô rát tê bì",
        "cat": "Mắt - TMH",
        "aliases": "moi kho te bi;kho moi;te moi;moi nut ne",
    },
    "slurred_speech": {
        "vi": "nói ngọng líu lưỡi (khó phát âm)",
        "cat": "Thần kinh",
        "aliases": "noi ngong;liu luoi;kho noi;noi kho nghe;meo tieng",
    },
    "knee_pain": {
        "vi": "đau nhức khớp gối",
        "cat": "Cơ xương khớp",
        "aliases": "dau khop goi;dau dau goi;moi goi;nhuc khop goi",
    },
    "hip_joint_pain": {
        "vi": "đau khớp háng",
        "cat": "Cơ xương khớp",
        "aliases": "dau khop hang;nhuc khop hang;dau vung hang",
    },
    "muscle_weakness": {
        "vi": "yếu cơ giảm trương lực",
        "cat": "Cơ xương khớp",
        "aliases": "yeu co;nhuoc co;co khong co suc;yeu bắp thit",
    },
    "stiff_neck": {
        "vi": "cứng cổ khó quay",
        "cat": "Cơ xương khớp",
        "aliases": "cung co;kho quay co;cung gay;co cung co",
    },
    "swelling_joints": {
        "vi": "sưng phù các khớp",
        "cat": "Cơ xương khớp",
        "aliases": "sung khop;phu khop;khop tay chan sung to",
    },
    "movement_stiffness": {
        "vi": "cứng khớp khi vận động",
        "cat": "Cơ xương khớp",
        "aliases": "cung khop buoi sang;kho van dong;khop bi cung",
    },
    "spinning_movements": {
        "vi": "chóng mặt cảm giác nhà cửa quay cuồng",
        "cat": "Thần kinh",
        "aliases": "nha cua quay cuong;quay cuong;cam giac xoay tron;chong mat quay",
    },
    "loss_of_balance": {
        "vi": "mất thăng bằng",
        "cat": "Thần kinh",
        "aliases": "mat thang bang;dung khong vung;di loang choang;khong giu duoc thang bang",
    },
    "unsteadiness": {
        "vi": "bước đi không vững (loạng choạng)",
        "cat": "Thần kinh",
        "aliases": "loang choang;di khong vung;chan nam da chan chieu;buoc hut",
    },
    "weakness_of_one_body_side": {
        "vi": "yếu liệt nửa người",
        "cat": "Thần kinh",
        "aliases": "yeu nua nguoi;liet nua nguoi;tay chan mot ben yeu;liet tay chan mot ben",
    },
    "loss_of_smell": {
        "vi": "mất khứu giác (không ngửi thấy mùi)",
        "cat": "Mắt - TMH",
        "aliases": "mat khuoc giac;khong ngui thay mui;mat mui;khong nhan biet mui",
    },
    "bladder_discomfort": {
        "vi": "tức bàng quang khó chịu vùng bọng đái",
        "cat": "Thận - Tiết niệu",
        "aliases": "tuc bang quang;kho chiu vung bong dai;tuc bung duoi do mac tieu",
    },
    "foul_smell_of_urine": {
        "vi": "nước tiểu có mùi hôi nồng",
        "cat": "Thận - Tiết niệu",
        "aliases": "nuoc tieu hoi;mui nuoc tieu nong;nuoc tieu mui kham;tieu mui la",
    },
    "continuous_feel_of_urine": {
        "vi": "mót tiểu liên tục (buồn tiểu mãi)",
        "cat": "Thận - Tiết niệu",
        "aliases": "buon tieu lien tuc;mot tieu;tieu dat tieu lien tuc;luc nao cung buon tieu",
    },
    "passage_of_gases": {
        "vi": "trung tiện nhiều (xì hơi liên tục)",
        "cat": "Tiêu hóa",
        "aliases": "xi hoi;danh ram;day hoi xì hoi nhieu;trung tien",
    },
    "internal_itching": {
        "vi": "ngứa râm ran bên trong",
        "cat": "Toàn thân",
        "aliases": "ngua ben trong;ngua ran ran;ngua sau trong da",
    },
    "toxic_look_typhos": {
        "vi": "bộ mặt nhiễm trùng nhiễm độc",
        "cat": "Toàn thân",
        "aliases": "ve mat nhiem trung;ve mat lu do;nhiem doc nhiem trung;bo mat typhos",
    },
    "depression": {
        "vi": "trầm cảm u uất",
        "cat": "Thần kinh",
        "aliases": "tram cam;u uat;tam trang chan nan;buon ba keo dai",
    },
    "irritability": {
        "vi": "dễ nổi cáu bực bội",
        "cat": "Thần kinh",
        "aliases": "de noi cau;buc boi;de cau gat;nong nay bat thuong",
    },
    "muscle_pain": {
        "vi": "đau nhức cơ bắp",
        "cat": "Cơ xương khớp",
        "aliases": "dau co;nhuc bắp thit;dau moi toan than;dau nhuc co bap",
    },
    "altered_sensorium": {
        "vi": "rối loạn tri giác (lẫn lộn mê sảng)",
        "cat": "Thần kinh",
        "aliases": "lan lon;me sang;suy giam y thuc;tri giac mo mang;roi loan y thuc",
    },
    "red_spots_over_body": {
        "vi": "chấm xuất huyết đỏ rải rác toàn thân",
        "cat": "Da liễu",
        "aliases": "cham do tren da;xuat huyet cham;cham do khap nguoi;not do tren da",
    },
    "belly_pain": {
        "vi": "đau bụng dưới âm ỉ",
        "cat": "Tiêu hóa",
        "aliases": "dau bung;dau bung duoi;nhuc bung;dau bung am i",
    },
    "abnormal_menstruation": {
        "vi": "rối loạn kinh nguyệt",
        "cat": "Toàn thân",
        "aliases": "roi loan kinh nguyet;kinh nguyet khong deu;rong kinh;kinh nguyet bat thuong",
    },
    "dischromic_patches": {
        "vi": "mảng da đổi màu loang lổ",
        "cat": "Da liễu",
        "aliases": "da loang lo;mang da doi mau;da khong deu mau;vet lang ben",
    },
    "watering_from_eyes": {
        "vi": "chảy nước mắt sống liên tục",
        "cat": "Mắt - TMH",
        "aliases": "chay nuoc mat;chay nuoc mat song;mat chay nuoc;chay ghen mat",
    },
    "increased_appetite": {
        "vi": "thèm ăn nhiều bất thường",
        "cat": "Tiêu hóa",
        "aliases": "them an;an nhieu;luc nao cung them an;an khong no",
    },
    "polyuria": {
        "vi": "tiểu nhiều lần trong ngày (đa niệu)",
        "cat": "Thận - Tiết niệu",
        "aliases": "tieu nhieu;di tieu nhieu lan;da nieu;dem tieu nhieu lan",
    },
    "family_history": {
        "vi": "tiền sử gia đình có người mắc bệnh",
        "cat": "Toàn thân",
        "aliases": "tien su gia dinh;gia dinh co nguoi bi;yeu to di truyen",
    },
    "mucoid_sputum": {
        "vi": "đờm nhầy trong nhầy trắng",
        "cat": "Hô hấp",
        "aliases": "dom nhay;dom trong;khac ra dom nhay;dom nhay trang",
    },
    "rusty_sputum": {
        "vi": "đờm màu rỉ sắt",
        "cat": "Hô hấp",
        "aliases": "dom mau ri sat;dom mau nau ri;dom co vet nau",
    },
    "lack_of_concentration": {
        "vi": "giảm tập trung chú ý",
        "cat": "Thần kinh",
        "aliases": "kho tap trung;kem tap trung;hay quen;giam su tap trung",
    },
    "visual_disturbances": {
        "vi": "rối loạn thị giác nhìn lóa",
        "cat": "Mắt - TMH",
        "aliases": "nhin loa;nhin hinh chong chanh;roi loan thi giac;mat chop sang",
    },
    "receiving_blood_transfusion": {
        "vi": "tiền sử truyền máu",
        "cat": "Toàn thân",
        "aliases": "truyen mau;tung duoc truyen mau;nhan mau",
    },
    "receiving_unsterile_injections": {
        "vi": "tiêm chích kim tiêm không vô trùng",
        "cat": "Toàn thân",
        "aliases": "tiem chich;chich kim khong vo trung;dung chung kim tiem",
    },
    "coma": {
        "vi": "hôn mê bất tỉnh",
        "cat": "Thần kinh",
        "aliases": "hon me;bat tinh;khong biet gi;hon me sau",
    },
    "stomach_bleeding": {
        "vi": "xuất huyết dạ dày (nôn ra máu, đi ngoài phân đen)",
        "cat": "Tiêu hóa",
        "aliases": "xuat huyet da day;non ra mau;phan den;chay mau bao tu",
    },
    "distention_of_abdomen": {
        "vi": "chướng căng phình bụng",
        "cat": "Tiêu hóa",
        "aliases": "chuong bung;phinh bung;bung cang cung;cang chuong bung",
    },
    "history_of_alcohol_consumption": {
        "vi": "tiền sử nghiện rượu bia",
        "cat": "Toàn thân",
        "aliases": "uong ruou;uong ruou bia thuong xuyen;nghien ruou;uong bia nhieu",
    },
    "blood_in_sputum": {
        "vi": "ho khạc ra máu trong đờm",
        "cat": "Hô hấp",
        "aliases": "ho ra mau;dom co mau;khac ra mau;dom lan mau",
    },
    "prominent_veins_on_calf": {
        "vi": "nổi gân tĩnh mạch phồng ở bắp chân",
        "cat": "Tim mạch",
        "aliases": "noi gân xanh o bap chan;gian tinh mach chan;gan xanh noi ro o chan",
    },
    "palpitations": {
        "vi": "hồi hộp đánh trống ngực",
        "cat": "Tim mạch",
        "aliases": "danh trong nguc;hoi hop;tim dap thinh thich;tim dap thon thuc",
    },
    "painful_walking": {
        "vi": "đau buốt khi đi lại",
        "cat": "Cơ xương khớp",
        "aliases": "di lai dau;di dau chan;kho di lai;dau khi buoc di",
    },
    "pus_filled_pimples": {
        "vi": "mụn mủ sưng đỏ",
        "cat": "Da liễu",
        "aliases": "mun mu;mun co mu;mun sung do;mun boc mu",
    },
    "blackheads": {
        "vi": "mụn đầu đen",
        "cat": "Da liễu",
        "aliases": "mun dau den;mun dau trang;mun cam",
    },
    "scurring": {
        "vi": "sẹo lõm sẹo thâm sau mụn",
        "cat": "Da liễu",
        "aliases": "seo tham;seo mun;seo lom;vet tham sau mun",
    },
    "skin_peeling": {
        "vi": "da bong tróc vảy",
        "cat": "Da liễu",
        "aliases": "da bong troc;troc da;bong da;da bong vay",
    },
    "silver_like_dusting": {
        "vi": "vảy trắng như bụi phấn bạc trên da",
        "cat": "Da liễu",
        "aliases": "vay trang bac;bui phan tren da;vay trang nhu phan;vay nen trang",
    },
    "small_dents_in_nails": {
        "vi": "móng tay có vết rỗ chấm nhỏ",
        "cat": "Da liễu",
        "aliases": "mong tay ro;cham ro tren mong;mong tay lom dom;ro mong",
    },
    "inflammatory_nails": {
        "vi": "viêm quanh móng sưng đỏ",
        "cat": "Da liễu",
        "aliases": "viem quanh mong;sung quanh mong tay;sung mong;viem phao mong",
    },
    "blister": {
        "vi": "mụn nước phồng rộp",
        "cat": "Da liễu",
        "aliases": "mun nuoc;phong rop;bong nuoc;phong da",
    },
    "red_sore_around_nose": {
        "vi": "vết loét đỏ quanh mũi miệng",
        "cat": "Da liễu",
        "aliases": "loet quanh mui;vet loet mui;do quanh mui;lo mui",
    },
    "yellow_crust_ooze": {
        "vi": "vảy tiết màu vàng rỉ dịch",
        "cat": "Da liễu",
        "aliases": "ri dich vang;vay vang;dong vảy vang;chay dich vang",
    },
}


VIETNAMESE_DISEASE_DESCRIPTIONS: dict[str, str] = {
    "vertigo_paroxysmal_positional_vertigo": "Chóng mặt kịch phát tư thế lành tính là tình trạng rối loạn tiền đình gây ra các cơn chóng mặt quay cuồng ngắn khi thay đổi tư thế đầu.",
    "aids": "Hội chứng suy giảm miễn dịch mắc phải là giai đoạn tiến triển muộn của nhiễm HIV làm suy yếu nghiêm trọng hệ miễn dịch của cơ thể.",
    "acne": "Mụn trứng cá là bệnh da liễu phổ biến xảy ra khi nang lông bị bít tắc bởi bã nhờn và tế bào chết, dẫn đến viêm sưng.",
    "alcoholic_hepatitis": "Viêm gan do rượu là tình trạng hoại tử và viêm tế bào gan do lạm dụng đồ uống có cồn trong thời gian kéo dài.",
    "allergy": "Dị ứng là phản ứng quá mẫn của hệ miễn dịch cơ thể đối với các dị nguyên từ môi trường bên ngoài.",
    "arthritis": "Viêm khớp là tình trạng viêm một hoặc nhiều khớp xương, gây đau nhức, sưng tấy và cứng khớp hạn chế vận động.",
    "bronchial_asthma": "Hen phế quản là bệnh lý viêm mạn tính đường hô hấp, đặc trưng bởi các cơn co thắt phế quản gây khó thở, thở rít và ho khan.",
    "cervical_spondylosis": "Thoái hóa cột sống cổ là bệnh lý thoái hóa sụn khớp và đốt sống vùng cổ, gây đau mỏi cổ vai gáy lan xuống tay.",
    "chicken_pox": "Bệnh thủy đậu là bệnh truyền nhiễm cấp tính do virus Varicella-Zoster gây ra, đặc trưng bởi các nốt phát ban phỏng nước gây ngứa.",
    "chronic_cholestasis": "Ứ mật mạn tính là hội chứng giảm hoặc tắc nghẽn dòng chảy của mật từ gan xuống ruột kéo dài, gây vàng da và ngứa ngáy.",
    "common_cold": "Cảm lạnh thông thường là bệnh nhiễm siêu vi cấp tính ở đường hô hấp trên, gây sốt nhẹ, ho, nghẹt mũi và hắt hơi liên tục.",
    "dengue": "Sốt xuất huyết Dengue là bệnh truyền nhiễm cấp tính do virus Dengue lây qua muỗi vằn Aedes, gây sốt cao liên tục và xuất huyết.",
    "diabetes": "Đái tháo đường là bệnh rối loạn chuyển hóa mạn tính làm tăng nồng độ đường huyết kéo dài do thiếu hụt hoặc kháng hormone insulin.",
    "dimorphic_hemmorhoids_piles": "Bệnh trĩ hỗn hợp là tình trạng các đám rối tĩnh mạch vùng hậu môn trực tràng bị giãn và phình to kết hợp cả búi trĩ nội và trĩ ngoại.",
    "drug_reaction": "Dị ứng thuốc là phản ứng bất lợi không mong muốn của hệ miễn dịch đối với thuốc điều trị, biểu hiện qua mẩn ngứa và ban đỏ ngoài da.",
    "fungal_infection": "Nhiễm nấm da là bệnh da liễu phổ biến do vi nấm ký sinh và phát triển trên da, niêm mạc hoặc móng gây ngứa rát và bong tróc.",
    "gerd": "Trào ngược dạ dày thực quản là tình trạng dịch vị axit dạ dày trào ngược lên thực quản, gây ợ nóng, ợ chua và viêm loét niêm mạc.",
    "gastroenteritis": "Viêm dạ dày ruột cấp là tình trạng viêm niêm mạc dạ dày và ruột do virus hoặc vi khuẩn, gây buồn nôn, nôn mửa và tiêu chảy.",
    "heart_attack": "Nhồi máu cơ tim cấp là tình trạng cấp cứu nguy kịch xảy ra khi dòng máu nuôi tim bị tắc đột ngột gây thiếu máu cục bộ và hoại tử cơ tim.",
    "hepatitis_b": "Viêm gan siêu vi B là bệnh nhiễm trùng gan do virus HBV lây truyền qua máu và đường tình dục, có nguy cơ tiến triển thành xơ gan hoặc ung thư gan.",
    "hepatitis_c": "Viêm gan siêu vi C là bệnh nhiễm trùng gan do virus HCV gây tổn thương gan âm thầm và mạn tính, dễ dẫn đến biến chứng xơ gan.",
    "hepatitis_d": "Viêm gan siêu vi D là bệnh nhiễm trùng gan nghiêm trọng do virus HDV gây ra, chỉ xảy ra ở người đồng thời nhiễm virus viêm gan B.",
    "hepatitis_e": "Viêm gan siêu vi E là bệnh viêm gan cấp tính do virus HEV gây ra, lây truyền chủ yếu qua đường tiêu hóa do thức ăn hoặc nguồn nước ô nhiễm.",
    "hypertension": "Tăng huyết áp là bệnh mạn tính khi áp lực dòng máu tác động lên thành động mạch tăng cao kéo dài, làm tăng nguy cơ tai biến tim mạch.",
    "hyperthyroidism": "Cường giáp là hội chứng tuyến giáp hoạt động quá mức làm tăng tiết hormone giáp, thúc đẩy chuyển hóa gây sút cân, tim đập nhanh và hồi hộp.",
    "hypoglycemia": "Hạ đường huyết cấp là tình trạng nồng độ glucose trong máu giảm xuống mức thấp bất thường, gây choáng váng, run tay chân và vã mồ hôi.",
    "hypothyroidism": "Suy giáp là tình trạng tuyến giáp hoạt động kém không sản xuất đủ hormone giáp cần thiết, gây mệt mỏi, sợ lạnh và suy giảm chuyển hóa.",
    "impetigo": "Bệnh chốc lở là bệnh nhiễm trùng da mủ có tính lây nhiễm cao do tụ cầu hoặc liên cầu khuẩn, đặc trưng bởi các nốt phỏng mủ đóng vảy màu mật ong.",
    "jaundice": "Hội chứng vàng da là tình trạng da và củng mạc mắt nhuốm màu vàng do tăng nồng độ bilirubin trong máu, là dấu hiệu bệnh lý gan mật.",
    "malaria": "Bệnh sốt rét là bệnh truyền nhiễm do ký sinh trùng Plasmodium truyền qua vết đốt của muỗi Anopheles, gây ra các cơn sốt rét run có chu kỳ.",
    "migraine": "Đau nửa đầu Migraine là chứng rối loạn thần kinh đặc trưng bởi cơn đau đầu dữ dội một bên đập theo nhịp mạch, kèm sợ ánh sáng và tiếng ồn.",
    "osteoarthritis": "Thoái hóa khớp là bệnh lý khớp mạn tính đặc trưng bởi sự suy thoái dần của sụn khớp và xương dưới sụn, gây đau cứng khớp khi vận động.",
    "paralysis_brain_hemorrhage": "Liệt do xuất huyết não là tai biến mạch máu não nguy kịch khi mạch máu não bị vỡ gây tụ máu chèn ép mô não và liệt vận động nửa người.",
    "peptic_ulcer_disease": "Loét dạ dày tá tràng là các ổ tổn thương loét khuyết sâu vào lớp niêm mạc dạ dày hoặc tá tràng, gây đau rát bỏng vùng thượng vị.",
    "pneumonia": "Viêm phổi là tình trạng nhiễm trùng phế nang tại một hoặc hai bên phổi do vi khuẩn, virus hoặc nấm, gây sốt cao, ho có đờm và khó thở.",
    "psoriasis": "Bệnh vảy nến là bệnh da liễu tự miễn mạn tính đặc trưng bởi các mảng đỏ nổi gờ trên da phủ vảy trắng bạc, gây ngứa ngáy và bong tróc.",
    "tuberculosis": "Lao phổi là bệnh truyền nhiễm do trực khuẩn Mycobacterium tuberculosis tấn công nhu mô phổi, gây ho kéo dài, ho ra máu và sụt cân.",
    "typhoid": "Sốt thương hàn là bệnh nhiễm trùng toàn thân cấp tính do trực khuẩn Salmonella typhi lây qua đường tiêu hóa, gây sốt li bì và tiêu chảy.",
    "urinary_tract_infection": "Nhiễm trùng đường tiết niệu là tình trạng viêm nhiễm do vi khuẩn ở bất kỳ bộ phận nào của hệ tiết niệu, gây tiểu buốt, tiểu rắt và đau tức hạ vị.",
    "varicose_veins": "Suy giãn tĩnh mạch chi dưới là tình trạng tĩnh mạch ở chân bị giãn nở và biến dạng do suy van tĩnh mạch, gây sưng phù và nặng mỏi bắp chân.",
    "hepatitis_a": "Viêm gan siêu vi A là bệnh nhiễm trùng gan cấp tính do virus HAV lây truyền qua đường tiêu hóa từ thức ăn hoặc nguồn nước ô nhiễm.",
}


def build_kb_files() -> None:
    """Generate all normalized KB CSV files."""
    kb_dir = settings.KB_DIR
    kb_dir.mkdir(parents=True, exist_ok=True)
    raw_dir = settings.RAW_DATA_DIR

    logger.info(f"Generating knowledge base files in {kb_dir}...")

    # 1. Load description.csv
    desc_df = pd.read_csv(raw_dir / "description.csv")
    desc_map: dict[str, str] = {}
    for _, r in desc_df.iterrows():
        d_name = str(r["Disease"]).strip()
        desc_map[d_name] = str(r["Description"]).strip()

    # 2. Build diseases.csv
    diseases_rows: list[dict[str, Any]] = []
    for raw_name, meta in DISEASE_METADATA.items():
        d_id = str(meta["id"])
        # Prefer standardized Vietnamese clinical description
        desc = VIETNAMESE_DISEASE_DESCRIPTIONS.get(d_id, "")
        if not desc:
            desc = desc_map.get(raw_name.strip(), desc_map.get(str(meta["name_vi"]), ""))
        if not desc:
            # Fallback fuzzy match
            for k, v in desc_map.items():
                if disease_to_id(k) == d_id:
                    desc = v
                    break

        diseases_rows.append(
            {
                "id": meta["id"],
                "name_vi": meta["name_vi"],
                "name_en": raw_name.strip(),
                "specialty": meta["specialty"],
                "description": desc,
                "aliases": meta["aliases"],
                "red_flag": "true" if meta["red_flag"] else "false",
                "source": "dataset/description.csv",
                "reviewed": "false",
            }
        )

    diseases_path = kb_dir / "diseases.csv"
    with open(diseases_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name_vi",
                "name_en",
                "specialty",
                "description",
                "aliases",
                "red_flag",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(diseases_rows)
    logger.info(f"Created {diseases_path} ({len(diseases_rows)} diseases)")

    # 3. Load severity weights
    sev_df = pd.read_csv(raw_dir / "Symptom-severity.csv")
    sev_map: dict[str, int] = {}
    for _, r in sev_df.iterrows():
        sym_norm = normalize_symptom(str(r["Symptom"]))
        sev_map[sym_norm] = int(r["weight"])

    # 4. Build symptoms.csv & symptom_map_vi.csv
    train_df = pd.read_csv(raw_dir / "Training.csv")
    train_symptoms = [c for c in train_df.columns if c != "prognosis"]
    unique_norm_symptoms = sorted(list(set(normalize_symptom(c) for c in train_symptoms)))

    symptoms_rows: list[dict[str, Any]] = []
    map_rows: list[dict[str, Any]] = []

    for sym_id in unique_norm_symptoms:
        trans = SYMPTOM_TRANSLATIONS.get(
            sym_id,
            {
                "vi": sym_id.replace("_", " "),
                "cat": "Toàn thân",
                "aliases": sym_id.replace("_", " "),
            },
        )
        weight = sev_map.get(sym_id, 3)

        symptoms_rows.append(
            {
                "id": sym_id,
                "name_vi": trans["vi"],
                "name_en": sym_id.replace("_", " "),
                "category": trans["cat"],
                "severity_weight": weight,
                "aliases": trans["aliases"],
                "source": "dataset/Symptom-severity.csv",
                "reviewed": "false",
            }
        )

        map_rows.append(
            {
                "symptom_id": sym_id,
                "name_en": sym_id.replace("_", " "),
                "name_vi": trans["vi"],
                "aliases_vi": trans["aliases"],
                "reviewed": "false",
                "source": "TODO",
            }
        )

    symptoms_path = kb_dir / "symptoms.csv"
    with open(symptoms_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name_vi",
                "name_en",
                "category",
                "severity_weight",
                "aliases",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(symptoms_rows)
    logger.info(f"Created {symptoms_path} ({len(symptoms_rows)} symptoms)")

    map_path = kb_dir / "symptom_map_vi.csv"
    with open(map_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=["symptom_id", "name_en", "name_vi", "aliases_vi", "reviewed", "source"],
        )
        writer.writeheader()
        writer.writerows(map_rows)
    logger.info(f"Created {map_path} ({len(map_rows)} mappings)")

    # 5. Build medicines.csv & disease_medicine.csv from medications.csv
    med_df = pd.read_csv(raw_dir / "medications.csv")
    medicine_dict: dict[str, dict[str, Any]] = {}
    disease_med_rows: list[dict[str, Any]] = []

    # Map disease names in medications.csv to disease_id
    for _, row in med_df.iterrows():
        raw_dis = str(row["Disease"]).strip()
        # Find matching disease_id
        target_dis_id = None
        for k, meta in DISEASE_METADATA.items():
            k_id = disease_to_id(k)
            raw_id = disease_to_id(raw_dis)
            if (
                k_id == raw_id
                or ("peptic" in k_id and "peptic" in raw_id)
                or ("vertigo" in k_id and "vertigo" in raw_id)
            ):
                target_dis_id = str(meta["id"])
                break
        if not target_dis_id:
            logger.warning(f"Could not find disease mapping for '{raw_dis}' in medications.csv")
            continue

        raw_med_str = str(row["Medication"])
        try:
            med_list = ast.literal_eval(raw_med_str)
        except Exception:
            med_list = [raw_med_str]

        for rank, med_name in enumerate(med_list):
            med_name_clean = med_name.strip()
            med_id = "med_" + disease_to_id(med_name_clean)

            if med_id not in medicine_dict:
                # Determine prescription requirement and category
                is_rx = True
                grp = "Dược lý lâm sàng"
                contraindications = ""

                lower_m = med_name_clean.lower()
                if (
                    "exercise" in lower_m
                    or "diet" in lower_m
                    or "compress" in lower_m
                    or "therapy" in lower_m
                    or "juice" in lower_m
                    or "bath" in lower_m
                ):
                    is_rx = False
                    grp = "Biện pháp hỗ trợ không dùng thuốc"
                elif (
                    "cream" in lower_m
                    or "ointment" in lower_m
                    or "antacid" in lower_m
                    or "tablets" in lower_m
                ):
                    is_rx = False
                    grp = "Thuốc không kê đơn (OTC)"
                elif "antibiotic" in lower_m or "penicillin" in lower_m:
                    contraindications = "penicillin;cephalosporin;di ung khang sinh"
                    grp = "Kháng sinh"
                elif "nsaid" in lower_m or "aspirin" in lower_m:
                    contraindications = "nsaid;aspirin;loet da day ta trang;suy than"
                    grp = "Thuốc giảm đau chống viêm"

                # Enrich with clinical dosage, usage, and instructions
                dos, inst, usage_vi = get_medicine_dosage_instruction(med_name_clean, grp)

                medicine_dict[med_id] = {
                    "id": med_id,
                    "name": med_name_clean,
                    "active_ingredient": med_name_clean,
                    "group": grp,
                    "usage": usage_vi,
                    "dosage": dos,
                    "instruction": inst,
                    "prescription_required": "true" if is_rx else "false",
                    "contraindications": contraindications,
                    "source": "dataset/medications.csv",
                    "reviewed": "false",
                }

            # Weight: first-line gets 1.0, second-line gets 0.85, 0.75, 0.65, 0.55
            med_weight = max(0.5, round(1.0 - (rank * 0.1), 2))
            line = 1 if rank < 2 else 2

            disease_med_rows.append(
                {
                    "disease_id": target_dis_id,
                    "medicine_id": med_id,
                    "weight": med_weight,
                    "line": line,
                    "note": f"Thuốc gợi ý dòng {line} từ dataset",
                    "source": "dataset/medications.csv",
                    "reviewed": "false",
                }
            )

    medicines_path = kb_dir / "medicines.csv"
    with open(medicines_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "id",
                "name",
                "active_ingredient",
                "group",
                "usage",
                "dosage",
                "instruction",
                "prescription_required",
                "contraindications",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(medicine_dict.values())
    logger.info(f"Created {medicines_path} ({len(medicine_dict)} medicines)")

    dm_path = kb_dir / "disease_medicine.csv"
    with open(dm_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "disease_id",
                "medicine_id",
                "weight",
                "line",
                "note",
                "source",
                "reviewed",
            ],
        )
        writer.writeheader()
        writer.writerows(disease_med_rows)
    logger.info(f"Created {dm_path} ({len(disease_med_rows)} associations)")

    # 6. Build disease_lifestyle.csv from diets, precautions, workouts
    build_lifestyle_kb(kb_dir, raw_dir)


def get_medicine_dosage_instruction(name: str, group: str) -> tuple[str, str, str]:
    """Return clinical (dosage, instruction, usage_vi) for a given medicine name."""
    lower = name.lower()
    if any(k in lower for k in ["cream", "ointment", "topical", "tar", "calamine", "paste", "gel"]):
        dosage = "Thoa một lớp mỏng 2-3 lần/ngày"
        instruction = "Vệ sinh sạch và lau khô vùng da trước khi bôi. Tránh để thuốc dính vào mắt hoặc niêm mạc hở."
        usage_vi = "Điều trị tại chỗ vùng da tổn thương, giảm viêm ngứa và sát trùng"
    elif any(k in lower for k in ["antibiotic", "penicillin", "amoxicillin", "rifampin", "isoniazid", "ethambutol", "pyrazinamide"]):
        dosage = "500mg, uống 1 viên x 2 lần/ngày (cách nhau 12 giờ)"
        instruction = "Uống đủ đợt điều trị (5-7 ngày) theo đơn bác sĩ, không tự ý ngưng thuốc khi thấy giảm triệu chứng."
        usage_vi = "Kháng sinh diệt khuẩn, điều trị các bệnh lý nhiễm khuẩn theo phác đồ"
    elif any(k in lower for k in ["antipyretic", "analgesic", "pain", "nsaid", "aspirin", "paracetamol", "acetaminophen", "phenazopyridine"]):
        dosage = "500mg, uống 1 viên khi sốt trên 38.5°C hoặc đau nhức, cách nhau tối thiểu 4-6 giờ (tối đa 4 viên/ngày)"
        instruction = "Uống sau bữa ăn với một ly nước đầy để bảo vệ dạ dày. Không dùng chung với thuốc khác có cùng hoạt chất."
        usage_vi = "Hạ sốt, giảm nhanh các cơn đau cấp tính (đau đầu, đau cơ, sốt cao)"
    elif any(k in lower for k in ["proton pump", "ppi", "h2 blocker", "antacid", "cytoprotective", "prokinetic"]):
        dosage = "20-40mg, uống 1 viên/ngày"
        instruction = "Uống nguyên viên trước bữa ăn sáng 30-60 phút với nước lọc, không nhai hoặc nghiền nát viên thuốc."
        usage_vi = "Ức chế tiết axit dịch vị, giảm ợ chua, bảo vệ niêm mạc dạ dày thực quản"
    elif any(k in lower for k in ["antihistamine", "decongestant", "leukotriene"]):
        dosage = "10mg, uống 1 viên/ngày"
        instruction = "Uống vào buổi tối trước khi đi ngủ. Thuốc có thể gây buồn ngủ nhẹ nên thận trọng khi lái xe."
        usage_vi = "Giảm ngứa, chống dị ứng, giảm phù nề niêm mạc mũi họng và đường hô hấp"
    elif any(k in lower for k in ["bronchodilator", "inhaled", "corticosteroid", "epinephrine", "oxygen"]):
        dosage = "Xịt 1-2 nhát khi có cơn khó thở hoặc theo cữ sáng/tối theo chỉ định"
        instruction = "Súc miệng sạch bằng nước ấm sau khi dùng thuốc xịt/hít để tránh nấm miệng và khản tiếng."
        usage_vi = "Giãn cơ trơn phế quản, kiểm soát cơn co thắt đường thở và thông khí phổi"
    elif any(k in lower for k in ["antihypertensive", "beta-blocker", "ace inhibitor", "calcium channel", "diuretic", "nitroglycerin", "blood thinner", "thrombolytic"]):
        dosage = "Uống 1 lần/ngày vào buổi sáng theo đúng liều lượng bác sĩ chuyên khoa tim mạch kê đơn"
        instruction = "Đo huyết áp hàng ngày, uống thuốc đều đặn vào cùng một khung giờ, không tự ý ngưng thuốc đột ngột."
        usage_vi = "Kiểm soát huyết áp, điều hòa tuần hoàn và bảo vệ chức năng tim mạch"
    elif any(k in lower for k in ["insulin", "metformin", "sulfonylurea", "dpp-4", "glp-1", "glucose", "glucagon", "dextrose", "diazoxide"]):
        dosage = "500-850mg, uống trong hoặc ngay sau bữa ăn chính (hoặc tiêm theo liều đơn vị bác sĩ ấn định)"
        instruction = "Ăn uống đúng giờ sau khi dùng thuốc để phòng ngừa hạ đường huyết quá mức. Kiểm tra đường huyết định kỳ."
        usage_vi = "Hạ và duy trì ổn định nồng độ đường huyết, ngăn ngừa biến chứng tiểu đường"
    elif any(k in lower for k in ["probiotic", "antiemetic", "antidiarrheal", "iv fluid", "laxative", "antispasmodic"]):
        dosage = "1-2 gói/viên mỗi lần, dùng 2 lần/ngày"
        instruction = "Pha với nước đun sôi để nguội. Nếu đang dùng kháng sinh, uống men vi sinh cách xa ít nhất 2 giờ."
        usage_vi = "Cân bằng hệ vi sinh đường ruột, hỗ trợ chức năng tiêu hóa và giảm kích thích co thắt ruột"
    elif any(k in lower for k in ["fluconazole", "terbinafine", "clotrimazole", "ketoconazole", "antifungal", "antiviral", "antimalarial", "antiretroviral", "protease", "integrase"]):
        dosage = "150mg/viên, uống theo liệu trình bác sĩ (1 liều duy nhất hoặc 1 lần/tuần)"
        instruction = "Uống cùng hoặc sau bữa ăn. Tuyệt đối không uống rượu bia trong suốt thời gian dùng thuốc điều trị."
        usage_vi = "Ức chế và tiêu diệt mầm bệnh vi nấm, virus theo phác đồ đặc hiệu"
    elif any(k in lower for k in ["levothyroxine", "antithyroid", "dmard", "biologic", "methotrexate", "ursodeoxycholic", "cholestyramine"]):
        dosage = "Uống 1 lần/ngày theo chỉ định nghiêm ngặt của bác sĩ chuyên khoa"
        instruction = "Uống thuốc vào buổi sáng khi bụng đói trước bữa ăn ít nhất 30 phút. Tái khám xét nghiệm máu định kỳ."
        usage_vi = "Điều hòa nội tiết tố và kiểm soát quá trình viêm tự miễn mạn tính"
    elif any(k in lower for k in ["therapy", "exercise", "surgery", "compress", "diet", "repositioning", "bath", "stocking", "transfusion", "cessation", "vaccination", "laser", "rehabilitation"]):
        dosage = "Thực hiện 1-2 lần/ngày hoặc theo đợt trị liệu"
        instruction = "Thực hiện đều đặn và cẩn trọng theo đúng hướng dẫn của nhân viên y tế hoặc kỹ thuật viên phục hồi chức năng."
        usage_vi = "Biện pháp hỗ trợ phục hồi chức năng, tăng cường thể trạng và hỗ trợ điều trị không dùng thuốc"
    else:
        dosage = "Liều lượng do bác sĩ chỉ định cụ thể dựa trên thể trạng lâm sàng"
        instruction = "Tuân thủ nghiêm ngặt liều lượng và thời gian sử dụng theo đơn thuốc của bác sĩ điều trị."
        usage_vi = "Hỗ trợ điều trị triệu chứng theo phác đồ lâm sàng chuẩn"
    return dosage, instruction, usage_vi


# Vietnamese translation mappings for diets, precautions, workouts
DIET_TRANSLATIONS: dict[str, str] = {
    "Acne diet": "Chế độ ăn cho người bị mụn (giảm đường và sữa động vật)",
    "Aloe vera juice": "Nước ép nha đam (lô hội) thanh nhiệt",
    "Anti-inflammatory diet": "Chế độ ăn chống viêm (giàu Omega-3 và chất chống oxy hóa)",
    "Antibiotic treatment": "Tuân thủ phác đồ điều trị kháng sinh theo chỉ định",
    "Antifungal diet": "Chế độ ăn kháng nấm (hạn chế đường, nấm men và tinh bột tinh chế)",
    "Antihistamine diet": "Chế độ ăn giảm dị ứng (hạn chế thực phẩm giàu histamine)",
    "Applesauce": "Sốt táo nghiền (dễ tiêu hóa, bổ sung pectin)",
    "Arthritis diet": "Chế độ ăn cho người viêm khớp (giàu Omega-3, tăng cường canxi)",
    "Balanced diet": "Chế độ ăn cân đối, đầy đủ dinh dưỡng",
    "Bananas": "Chuối chín (bổ sung kali và chất điện giải)",
    "Bland diet": "Chế độ ăn thanh đạm, thức ăn mềm dễ tiêu hóa",
    "Caffeine withdrawal": "Giảm dần và ngừng sử dụng caffeine",
    "Calcium-rich foods": "Thực phẩm giàu canxi (sữa hạt, rau xanh thẫm, mè đen)",
    "Chicken pox diet": "Chế độ ăn mềm, thanh nhiệt khi mắc thủy đậu",
    "Coconut oil": "Dầu dừa nguyên chất lượng vừa phải",
    "Cold diet": "Chế độ ăn lỏng, ấm khi bị cảm lạnh",
    "Complex carbohydrates": "Carbohydrate phức hợp (yến mạch, gạo lứt, khoai lang)",
    "Cranberry juice": "Nước ép nam việt quất (hỗ trợ bảo vệ đường tiết niệu)",
    "Dash diet": "Chế độ ăn DASH (chế độ ăn kiểm soát và hạ huyết áp)",
    "Dengue diet": "Chế độ dinh dưỡng nâng cao thể trạng khi sốt xuất huyết",
    "Elimination diet": "Chế độ ăn loại trừ dị nguyên thực phẩm",
    "Fiber-rich foods": "Thực phẩm giàu chất xơ (rau xanh, đậu, hoa quả tươi)",
    "Fresh fruits and vegetables": "Rau củ quả tươi sạch",
    "Fruits and vegetables": "Tăng cường rau xanh và trái cây tươi",
    "Garlic": "Bổ sung tỏi trong món ăn (kháng khuẩn, tăng đề kháng)",
    "Ginger": "Gừng tươi (làm ấm bụng, giảm buồn nôn)",
    "Ginger tea": "Trà gừng ấm làm dịu tiêu hóa",
    "Healthy fats": "Chất béo lành mạnh (dầu ô liu, quả bơ, các loại hạt)",
    "Heart-healthy diet": "Chế độ ăn tốt cho tim mạch (ít muối, hạn chế mỡ động vật)",
    "Hemorrhoids diet": "Chế độ ăn nhuận tràng cho người bệnh trĩ (nhiều chất xơ, nhiều nước)",
    "Hepatitis a diet": "Chế độ ăn mát gan, dễ tiêu hóa cho người viêm gan A",
    "Hepatitis b diet": "Chế độ ăn bảo vệ tế bào gan, giàu đạm sạch cho người viêm gan B",
    "Hepatitis c diet": "Chế độ ăn hạn chế mỡ, tuyệt đối kiêng bia rượu cho người viêm gan C",
    "Hepatitis d diet": "Chế độ ăn hỗ trợ phục hồi chức năng gan cho người viêm gan D",
    "Hepatitis e diet": "Chế độ ăn thanh đạm, ăn chín uống sôi cho người viêm gan E",
    "High-calorie diet": "Chế độ ăn giàu năng lượng giúp phục hồi thể trạng",
    "High-fiber diet": "Chế độ ăn giàu chất xơ hòa tan và không hòa tan",
    "Honey and lemon tea": "Trà chanh mật ong ấm làm dịu cổ họng",
    "Hydration": "Bổ sung đủ nước mỗi ngày (2 - 2.5 lít nước)",
    "Hyperthyroidism diet": "Chế độ ăn hạn chế iod cho người cường giáp",
    "Hypoglycemia diet": "Chế độ ăn chia nhỏ bữa, ngừa tụt đường huyết",
    "Hypothyroidism diet": "Chế độ ăn bổ sung iod và selen cho người suy giáp",
    "Impetigo diet": "Chế độ ăn nâng cao đề kháng cho người viêm da chốc lở",
    "Iodine-rich foods": "Thực phẩm giàu iod (hải sản, muối iod vừa phải)",
    "Lean proteins": "Protein nạc (ức gà, cá tươi, đậu phụ)",
    "Licorice": "Cam thảo (hỗ trợ làm dịu niêm mạc dạ dày)",
    "Liver-healthy diet": "Chế độ ăn giải độc, bảo vệ nhu mô gan",
    "Low-acid diet": "Chế độ ăn giảm axit (tránh đồ chua, cay, lên men)",
    "Low-fat dairy": "Sữa và các chế phẩm từ sữa ít béo",
    "Low-fat diet": "Chế độ ăn giảm tối đa chất béo bão hòa",
    "Low-glycemic diet": "Chế độ ăn thực phẩm có chỉ số đường huyết thấp (Low GI)",
    "Low-iodine diet": "Chế độ ăn kiêng hoặc giảm iod theo chỉ định",
    "Low-salt diet": "Chế độ ăn giảm muối (dưới 5g muối/ngày)",
    "Low-sodium foods": "Thực phẩm chứa hàm lượng natri thấp",
    "Low-tyramine diet": "Chế độ ăn ít tyramine (ngừa đau nửa đầu)",
    "Magnesium-rich foods": "Thực phẩm giàu magie (chuối, các loại hạt dinh dưỡng, rau bina)",
    "Malaria diet": "Chế độ dinh dưỡng nâng cao thể trạng cho người mắc sốt rét",
    "Migraine diet": "Chế độ ăn tránh thực phẩm kích hoạt cơn đau nửa đầu",
    "Omega-3-rich foods": "Thực phẩm giàu Omega-3 (cá hồi, hạt chia, hạt óc chó)",
    "Oral rehydration solutions": "Dung dịch bù nước và điện giải (Oresol) pha đúng tỷ lệ",
    "Pneumonia diet": "Chế độ ăn giàu đạm và vitamin cho người viêm phổi",
    "Probiotics": "Bổ sung men vi sinh probiotic (sữa chua, men sống)",
    "Protein-rich foods": "Thực phẩm giàu chất đạm chất lượng cao",
    "Protein-rich snacks": "Bữa phụ bổ sung protein lành mạnh",
    "Psoriasis diet": "Chế độ ăn kháng viêm cho người bệnh vảy nến",
    "Quercetin-rich foods": "Thực phẩm giàu quercetin (hành tây, táo, quả mọng)",
    "Rest": "Nghỉ ngơi yên tĩnh, ngủ đủ giấc",
    "Rice": "Cơm hoặc cháo trắng nấu nhừ dễ tiêu hóa",
    "Selenium-rich foods": "Thực phẩm giàu selen (hạt ngũ cốc nguyên cám)",
    "Soft and bland foods": "Thức ăn mềm, nhạt, dễ nuốt (súp, cháo, canh dinh dưỡng)",
    "Stool softeners": "Bổ sung thực phẩm tự nhiên giúp làm mềm phân (khoai lang, đu đủ)",
    "Tb diet": "Chế độ ăn giàu dinh dưỡng và năng lượng cho người bệnh lao phổi",
    "Toast": "Bánh mì nướng giòn nhẹ",
    "Turmeric": "Tinh bột nghệ (chống viêm, bảo vệ niêm mạc dạ dày)",
    "Typhoid diet": "Chế độ ăn lỏng, chín kỹ, đảm bảo vệ sinh cho người sốt thương hàn",
    "Uti diet": "Chế độ ăn uống lợi tiểu, nhiều nước cho người nhiễm trùng tiết niệu",
    "Varicose veins diet": "Chế độ ăn giàu flavonoid và chất xơ cho người suy giãn tĩnh mạch",
    "Vertigo diet": "Chế độ ăn kiểm soát chóng mặt tiền đình (ít muối, bù đủ nước)",
    "Vitamin c-rich foods": "Thực phẩm giàu vitamin C (cam, ổi, bưởi, ớt chuông)",
    "Vitamin d-rich foods": "Thực phẩm giàu vitamin D (cá béo, lòng đỏ trứng)",
    "Warm baths": "Tắm hoặc ngâm mình trong nước ấm thư giãn",
    "Warm fluids": "Dùng nước ấm, súp ấm hoặc canh nóng",
    "Whole grains": "Ngũ cốc nguyên hạt (yến mạch, gạo lứt, lúa mạch)",
}

PRECAUTION_TRANSLATIONS: dict[str, str] = {
    "Acetaminophen": "Dùng Paracetamol hạ sốt, giảm đau theo đúng liều lượng hướng dẫn",
    "Anti itch medicine": "Dùng thuốc giảm ngứa ngoài da theo chỉ định của bác sĩ",
    "Antiboitic therapy": "Tuân thủ nghiêm ngặt phác đồ điều trị kháng sinh của bác sĩ",
    "Apply calamine": "Thoa kem dưỡng Calamine làm dịu vùng da ngứa rát và kích ứng",
    "Avoid abrupt head movment": "Tránh thay đổi tư thế đầu hoặc quay đầu đột ngột",
    "Avoid cold food": "Tránh đồ ăn lạnh, thực phẩm đông đá và nước đá lạnh",
    "Avoid fatty spicy food": "Tránh thực phẩm nhiều dầu mỡ, đồ chiên rán và cay nóng",
    "Avoid lying down after eating": "Không nằm ngay sau khi ăn (ngồi nghỉ hoặc đi lại nhẹ nhàng ít nhất 2-3 giờ)",
    "Avoid non veg food": "Hạn chế thịt đỏ và thực phẩm khó tiêu trong giai đoạn bệnh cấp tính",
    "Avoid oily food": "Hạn chế tối đa các món ăn xào rán nhiều dầu mỡ",
    "Avoid open cuts": "Tránh để vết thương hở tiếp xúc với chất bẩn hoặc nguồn lây nhiễm",
    "Avoid public places": "Hạn chế đến nơi đông người để phòng ngừa lây nhiễm chéo",
    "Avoid sudden change in body": "Tránh thay đổi tư thế cơ thể đột ngột (từ nằm sang đứng dậy)",
    "Avoid too many products": "Không lạm dụng cùng lúc nhiều sản phẩm chăm sóc da hoặc mỹ phẩm",
    "Bath twice": "Tắm rửa vệ sinh cơ thể sạch sẽ bằng nước ấm 2 lần mỗi ngày",
    "Call ambulance": "Gọi cấp cứu y tế 115 ngay lập tức",
    "Check in pulse": "Theo dõi sát sao mạch đập và nhịp tim",
    "Chew or swallow asprin": "Nhai hoặc uống Aspirin cấp cứu theo chỉ dẫn khẩn cấp của nhân viên y tế",
    "Cold baths": "Tắm hoặc chườm nước mát để hạ nhiệt và giảm cảm giác ngứa",
    "Consult doctor": "Thăm khám và tham khảo ý kiến bác sĩ chuyên khoa",
    "Consult nearest hospital": "Đến ngay bệnh viện hoặc cơ sở y tế gần nhất",
    "Consume alovera juice": "Uống nước ép nha đam hỗ trợ nhuận tràng và thanh nhiệt",
    "Consume milk thistle": "Sử dụng chiết xuất cây kế sữa (Milk Thistle) hỗ trợ giải độc gan",
    "Consume neem leaves": "Dùng nước lá thảo dược tự nhiên để sát khuẩn, làm dịu da",
    "Consume probiotic food": "Bổ sung thực phẩm giàu lợi khuẩn men vi sinh",
    "Consume witch hazel": "Dùng chiết xuất cây phỉ làm dịu vùng niêm mạc tổn thương",
    "Cover area with bandage": "Băng che vùng da tổn thương bằng gạc vô trùng",
    "Cover mouth": "Dùng khăn giấy hoặc khuỷu tay che miệng khi ho hoặc hắt hơi",
    "Dont stand still for long": "Không đứng bất động một chỗ trong thời gian dài",
    "Drink cranberry juice": "Uống nước ép nam việt quất hỗ trợ làm sạch đường tiết niệu",
    "Drink papaya leaf juice": "Uống nước ép lá đu đủ hỗ trợ nâng cao thể trạng và lượng tiểu cầu",
    "Drink plenty of water": "Uống nhiều nước lọc ấm hàng ngày (khoảng 2 lít)",
    "Drink sugary drinks": "Uống ngay nước đường hoặc nước trái cây ngọt khi có dấu hiệu hạ đường huyết",
    "Drink vitamin c rich drinks": "Uống các loại nước ép hoa quả giàu vitamin C (cam, bưởi)",
    "Ease back into eating": "Bắt đầu ăn lại từ từ với lượng nhỏ thức ăn lỏng, nhạt",
    "Eat fruits and high fiberous food": "Ăn nhiều trái cây tươi và thực phẩm giàu chất xơ",
    "Eat healthy": "Duy trì chế độ ăn uống khoa học, lành mạnh và đủ chất",
    "Eat high calorie vegitables": "Bổ sung các loại củ quả giàu calo và dinh dưỡng tự nhiên",
    "Eliminate milk": "Tạm kiêng sữa động vật nếu có biểu hiện đầy hơi hoặc bất dung nạp",
    "Exercise": "Tập thể dục nhẹ nhàng, vừa sức đều đặn mỗi ngày",
    "Follow up": "Tái khám định kỳ theo đúng lịch hẹn của bác sĩ điều trị",
    "Get away from trigger": "Tránh xa các dị nguyên hoặc yếu tố kích thích khởi phát bệnh",
    "Get proper sleep": "Đảm bảo giấc ngủ sâu và đủ từ 7 - 8 tiếng mỗi đêm",
    "Have balanced diet": "Xây dựng khẩu phần ăn cân đối giữa các nhóm dưỡng chất",
    "Increase vitamin c intake": "Tăng cường bổ sung vitamin C từ rau xanh và trái cây",
    "Keep calm": "Giữ tinh thần bình tĩnh, thả lỏng, tránh căng thẳng hoảng loạn",
    "Keep fever in check": "Theo dõi thân nhiệt thường xuyên bằng nhiệt kế (3-4 giờ/lần)",
    "Keep hydrated": "Duy trì đủ lượng nước cho cơ thể suốt cả ngày",
    "Keep infected area dry": "Giữ vùng da tổn thương hoặc nhiễm trùng luôn khô ráo, thoáng khí",
    "Keep mosquitos away": "Nằm màn, mặc quần áo dài tay và dùng kem chống muỗi",
    "Keep mosquitos out": "Loại bỏ các ổ đọng nước, diệt lăng quăng và giữ sạch môi trường sống",
    "Lie down": "Nằm nghỉ ngơi ở nơi yên tĩnh, thoáng khí",
    "Lie down flat and raise the leg high": "Nằm ngửa trên mặt phẳng và kê cao hai chân để tăng tuần hoàn máu",
    "Lie down on side": "Nằm nghiêng người sang một bên để hỗ trợ hô hấp và tránh sặc",
    "Limit alcohol": "Hạn chế tối đa việc sử dụng rượu, bia và đồ uống có cồn",
    "Maintain healthy weight": "Duy trì chỉ số cân nặng hợp lý (BMI trong ngưỡng chuẩn)",
    "Massage": "Xoa bóp, massage nhẹ nhàng vùng cơ khớp bị căng cứng",
    "Medication": "Sử dụng thuốc đúng liều, đúng giờ theo đơn bác sĩ",
    "Meditation": "Tập thiền định hoặc hít thở sâu để giảm căng thẳng thần kinh",
    "Reduce stress": "Kiểm soát căng thẳng, cân bằng giữa công việc và thời gian nghỉ ngơi",
    "Relax": "Thư giãn tinh thần và thả lỏng các nhóm cơ",
    "Remove scabs with wet compressed cloth": "Dùng khăn gạc ấm làm mềm và lau nhẹ vảy tiết, tuyệt đối không cạy bóc",
    "Rest": "Nghỉ ngơi hoàn toàn tại giường để cơ thể phục hồi năng lượng",
    "Salt baths": "Ngâm rửa vùng tổn thương bằng dung dịch nước muối sinh lý ấm",
    "Seek help": "Liên hệ ngay với người thân hoặc nhân viên y tế để được hỗ trợ",
    "Soak affected area in warm water": "Ngâm vùng tổn thương trong nước ấm khoảng 10 - 15 phút",
    "Stop alcohol consumption": "Tuyệt đối ngưng hoàn toàn việc uống rượu bia",
    "Stop bleeding using pressure": "Dùng gạc sạch ép chặt trực tiếp lên vị trí chảy máu để cầm máu",
    "Stop eating solid food for while": "Tạm dừng thức ăn dạng đặc trong vài giờ đầu khi đang nôn nhiều",
    "Stop irritation": "Tránh chà xát hoặc gãi mạnh làm trầy xước kích ứng da",
    "Stop taking drug": "Ngưng ngay thuốc nghi ngờ gây dị ứng và thông báo cho bác sĩ",
    "Switch to loose cloothing": "Mặc quần áo rộng rãi, chất liệu cotton mềm thoáng mát",
    "Take deep breaths": "Tập hít thở sâu, chậm rãi bằng bụng",
    "Take otc pain reliver": "Có thể dùng thuốc giảm đau thông thường (OTC) theo khuyến cáo",
    "Take probiotics": "Bổ sung men vi sinh để hỗ trợ cân bằng hệ khuẩn đường ruột",
    "Take radioactive iodine treatment": "Tuân thủ điều trị iod phóng xạ theo đúng phác đồ chuyên khoa",
    "Take vaccine": "Tiêm vắc xin phòng bệnh đầy đủ theo khuyến cáo",
    "Take vapour": "Xông hơi nước ấm vùng mũi họng để thông thoáng đường thở",
    "Try acupuncture": "Tham khảo liệu pháp châm cứu giảm đau từ bác sĩ y học cổ truyền",
    "Try taking small sips of water": "Uống từng ngụm nước nhỏ nhiều lần thay vì uống nhiều một lúc",
    "Use antibiotics": "Dùng kháng sinh đúng liều lượng và đủ ngày theo đơn kê",
    "Use clean cloths": "Sử dụng khăn mặt và quần áo giặt sạch, phơi khô dưới nắng",
    "Use detol or neem in bathing water": "Pha dung dịch sát khuẩn nhẹ hoặc thảo dược tự nhiên vào nước tắm",
    "Use heating pad or cold pack": "Sử dụng túi chườm ấm hoặc túi đá lạnh chườm lên vùng đau",
    "Use hot and cold therapy": "Áp dụng liệu pháp nhiệt nóng - lạnh luân phiên để giảm đau cứng khớp",
    "Use ice to compress itching": "Chườm túi đá bọc khăn mềm lên vùng da ngứa để giảm kích ứng",
    "Use lemon balm": "Sử dụng tinh dầu hoặc trà tía tô đất để xoa dịu thần kinh",
    "Use neem in bathing": "Tắm bằng nước lá thảo mộc có tính sát trùng tự nhiên",
    "Use oinments": "Bôi thuốc mỡ hoặc kem dưỡng ẩm bảo vệ da theo hướng dẫn",
    "Use poloroid glasses in sun": "Đeo kính râm chống tia UV khi ra ngoài trời nắng",
    "Use vein compression": "Mang vớ y khoa tạo áp lực hỗ trợ tĩnh mạch chân",
    "Vaccination": "Tiêm phòng vắc xin đầy đủ và đúng lịch hẹn",
    "Warm bath with epsom salt": "Ngâm tắm nước ấm hòa tan muối Epsom để giảm đau mỏi cơ",
    "Wash hands through": "Rửa tay sạch sẽ và kỹ càng bằng xà phòng",
    "Wash hands with warm soapy water": "Rửa tay thường xuyên bằng xà phòng dưới vòi nước sạch",
    "Wear ppe if possible": "Mang đồ bảo hộ cá nhân (khẩu trang, găng tay) khi tiếp xúc nguồn lây",
}

WORKOUT_TRANSLATIONS: dict[str, str] = {
    "Avoid alcohol and caffeine": "Kiêng rượu bia, đồ uống chứa cồn và caffeine",
    "Avoid alcohol consumption": "Tuyệt đối không uống rượu, bia trong thời gian điều trị",
    "Avoid allergenic foods": "Tránh các thực phẩm dễ gây dị ứng (hải sản, đậu phộng, trứng)",
    "Avoid artificial additives": "Hạn chế thực phẩm chứa chất bảo quản và phụ gia nhân tạo",
    "Avoid caffeine and alcohol": "Tránh sử dụng cà phê, trà đặc và rượu bia",
    "Avoid carbonated beverages": "Tránh các loại nước ngọt có ga và đồ uống đóng lon",
    "Avoid dairy products": "Hạn chế sữa và các sản phẩm từ sữa bò nếu gây khó tiêu",
    "Avoid fatty and greasy foods": "Hạn chế tối đa thức ăn nhiều mỡ, đồ chiên xào béo ngậy",
    "Avoid fried foods": "Tránh các món chiên rán ngập dầu mỡ",
    "Avoid late-night eating": "Tránh ăn khuya hoặc ăn sát giờ đi ngủ",
    "Avoid raw or undercooked foods": "Không ăn đồ sống, gỏi, tái; thực hiện ăn chín uống sôi",
    "Avoid scratching": "Tránh cào gãi làm tổn thương hoặc nhiễm trùng vết ngứa",
    "Avoid smoking and alcohol": "Bỏ hút thuốc lá và kiêng hoàn toàn rượu bia",
    "Avoid spicy and acidic foods": "Tránh thực phẩm cay nóng và đồ ăn có vị chua đậm",
    "Avoid spicy and greasy foods": "Tránh đồ ăn cay nóng kết hợp nhiều dầu mỡ",
    "Avoid spicy foods": "Hạn chế đồ ăn cay, ớt, tiêu",
    "Avoid standing or sitting for long periods": "Tránh đứng hoặc ngồi một chỗ trong thời gian dài (nên đi lại vận động sau mỗi 45 phút)",
    "Avoid sudden head movements": "Tránh quay lắc đầu hoặc cúi ngửa đầu đột ngột",
    "Avoid sugary foods": "Hạn chế đồ ngọt, bánh kẹo và đường tinh luyện",
    "Avoid sulfite-containing foods": "Tránh thực phẩm chứa chất bảo quản sulfite (hoa quả sấy khô, rượu vang)",
    "Avoid trigger foods": "Ghi nhận và tránh các loại thức ăn kích hoạt triệu chứng khó chịu",
    "Avoid trigger foods (caffeine, alcohol)": "Tránh thực phẩm kích thích hệ thần kinh như caffeine và cồn",
    "Avoid trigger foods (spicy, acidic)": "Tránh thức ăn cay nóng và thức ăn có tính axit cao",
    "Avoid trigger foods (spicy, fatty)": "Tránh các món ăn cay nồng và nhiều chất béo khó tiêu",
    "Chew food thoroughly": "Nhai kỹ, ăn chậm để giảm áp lực cho dạ dày",
    "Consider phototherapy under medical guidance": "Tham khảo liệu pháp quang học trị liệu theo chỉ định chuyên khoa",
    "Consult a healthcare professional": "Tham vấn ý kiến bác sĩ hoặc chuyên viên y tế",
    "Consult a registered dietitian": "Tham khảo tư vấn dinh dưỡng từ bác sĩ chuyên khoa",
    "Consult a skincare professional": "Thăm khám bác sĩ chuyên khoa Da liễu",
    "Consume a balanced diet": "Ăn uống cân đối, đủ 4 nhóm chất dinh dưỡng",
    "Consume a high-fiber diet": "Tăng cường chế độ ăn giàu chất xơ tự nhiên",
    "Consume a high-protein diet": "Bổ sung khẩu phần ăn giàu protein lành mạnh",
    "Consume a low-fat diet": "Duy trì chế độ ăn giảm chất béo động vật",
    "Consume anti-inflammatory foods": "Tăng cường thực phẩm có hoạt tính chống viêm",
    "Consume antioxidant-rich foods": "Bổ sung thực phẩm giàu chất chống oxy hóa",
    "Consume antioxidants": "Tăng cường các chất chống oxy hóa tự nhiên trong bữa ăn",
    "Consume calcium-rich foods": "Tăng cường thực phẩm giàu canxi giúp xương chắc khỏe",
    "Consume chicken soup": "Dùng súp hoặc cháo gà ấm giúp bồi bổ cơ thể",
    "Consume clear fluids": "Bổ sung các loại nước trong (nước lọc, nước dừa, nước canh nhạt)",
    "Consume complex carbohydrates": "Ưu tiên carbohydrate phức hợp (ngũ cốc nguyên hạt, yến mạch)",
    "Consume cranberry products": "Sử dụng các sản phẩm từ nam việt quất hỗ trợ đường tiểu",
    "Consume cruciferous vegetables in moderation": "Ăn rau họ cải với lượng vừa phải, nên nấu chín",
    "Consume easily digestible foods": "Ăn các món mềm, ninh nhừ, dễ tiêu hóa",
    "Consume foods rich in antioxidants": "Bổ sung hoa quả tươi giàu chất chống oxy hóa",
    "Consume foods rich in flavonoids": "Ăn thực phẩm giàu flavonoid bảo vệ mạch máu (trà xanh, quả mọng)",
    "Consume foods rich in vitamin c and antioxidants": "Tăng cường thực phẩm giàu vitamin C và chất chống oxy hóa",
    "Consume foods rich in vitamin k": "Bổ sung thực phẩm giàu vitamin K (rau cải bó xôi, súp lơ)",
    "Consume foods rich in vitamins a and c": "Tăng cường thực phẩm giàu vitamin A và vitamin C (cà rốt, cam, đu đủ)",
    "Consume foods rich in vitamins b and d": "Bổ sung thực phẩm giàu vitamin B và D (trứng, nấm, ngũ cốc)",
    "Consume ginger and ginkgo biloba": "Bổ sung gừng tươi và thảo dược bạch quả hỗ trợ tuần hoàn",
    "Consume green tea": "Uống trà xanh ấm lượng vừa phải để chống oxy hóa",
    "Consume healthy fats": "Bổ sung chất béo tốt từ dầu thực vật, quả bơ và hạt dinh dưỡng",
    "Consume high-fiber foods": "Tăng cường khẩu phần chất xơ từ rau củ quả",
    "Consume immune-boosting foods": "Ăn các thực phẩm giúp tăng cường hệ miễn dịch",
    "Consume local honey": "Dùng mật ong nguyên chất lượng nhỏ hỗ trợ làm dịu họng",
    "Consume magnesium-rich foods": "Bổ sung thực phẩm giàu magie giúp thư giãn cơ bắp",
    "Consume non-citrus fruits": "Ăn các loại trái cây không có vị chua gắt (chuối, táo, dưa hấu)",
    "Consume nutrient-rich foods": "Bổ sung thực phẩm giàu vi chất dinh dưỡng cần thiết",
    "Consume omega-3 fatty acids": "Tăng cường axit béo Omega-3 từ cá béo và các loại hạt",
    "Consume probiotics": "Bổ sung men vi sinh probiotic hỗ trợ tiêu hóa",
    "Consume protein-rich foods": "Bổ sung thực phẩm giàu đạm sạch (thịt gia cầm, cá, đậu đỗ)",
    "Consume regular meals and snacks": "Ăn uống đúng bữa và có bữa phụ hợp lý",
    "Consume riboflavin-rich foods": "Bổ sung thực phẩm giàu riboflavin (vitamin B2)",
    "Consume selenium-rich foods": "Bổ sung thực phẩm giàu selen (hải sản, ngũ cốc)",
    "Consume smaller meals": "Chia khẩu phần ăn thành các bữa nhỏ hơn",
    "Consume smaller, more frequent meals": "Chia nhỏ bữa ăn làm 4 - 5 bữa/ngày, không ăn quá no",
    "Discontinue offending medication": "Ngưng sử dụng loại thuốc nghi ngờ gây phản ứng có hại",
    "Eat a balanced diet": "Duy trì chế độ ăn uống khoa học, cân đối",
    "Eat balanced meals": "Ăn đúng giờ và đầy đủ các nhóm chất trong mỗi bữa",
    "Eat foods rich in vitamin c": "Bổ sung thực phẩm giàu vitamin C tự nhiên",
    "Eat foods rich in zinc": "Tăng cường thực phẩm chứa kẽm (thịt bò nạc, các loại đậu, hạt)",
    "Eat fruits and vegetables": "Tăng cường ăn rau củ và hoa quả tươi mỗi ngày",
    "Eat high-fiber foods": "Ưu tiên thực phẩm giàu chất xơ hòa tan",
    "Engage in low-impact exercise": "Tập luyện thể thao cường độ nhẹ nhàng (đi bộ, đạp xe chậm, yoga)",
    "Engage in regular exercise": "Duy trì thói quen tập thể dục đều đặn 30 phút mỗi ngày",
    "Engage in regular physical activity": "Duy trì hoạt động thể chất tích cực và vừa sức",
    "Follow a balanced and nutritious diet": "Tuân thủ chế độ ăn giàu dinh dưỡng và lành mạnh",
    "Follow a heart-healthy diet": "Áp dụng chế độ ăn tốt cho tim mạch và huyết áp",
    "Follow medical recommendations": "Thực hiện nghiêm túc các hướng dẫn và chỉ định y khoa",
    "Follow the brat diet (bananas, rice, applesauce, toast)": "Áp dụng thực đơn BRAT (chuối, cơm trắng, sốt táo, bánh mì nướng) khi rối loạn tiêu hóa",
    "Follow the dash diet (dietary approaches to stop hypertension)": "Áp dụng chế độ ăn DASH để kiểm soát huyết áp hiệu quả",
    "Gradually reintroduce solid foods": "Từng bước chuyển từ thức ăn lỏng sang thức ăn đặc khi dạ dày ổn định",
    "Gradually resume normal diet": "Dần trở lại chế độ ăn thông thường khi triệu chứng đã giảm hẳn",
    "Identify and avoid trigger foods": "Xác định rõ và loại bỏ các loại thức ăn gây khởi phát bệnh",
    "Include anti-inflammatory foods": "Tăng cường các nhóm thực phẩm kháng viêm tự nhiên",
    "Include antioxidant-rich foods": "Bổ sung các loại quả mọng và rau củ giàu chất chống oxy hóa",
    "Include antioxidants": "Bổ sung thực phẩm chứa hàm lượng chất chống oxy hóa cao",
    "Include bland foods": "Dùng thức ăn thanh đạm, ít gia vị kích thích",
    "Include easily digestible foods": "Lựa chọn các loại thực phẩm dễ hấp thu và dễ tiêu hóa",
    "Include fiber-rich foods": "Bổ sung chất xơ tự nhiên từ ngũ cốc và rau xanh",
    "Include flavonoid-rich foods": "Tăng cường thực phẩm giàu flavonoid bảo vệ thành mạch",
    "Include foods rich in vitamin c": "Ăn nhiều hoa quả giàu vitamin C giúp tăng sức đề kháng",
    "Include ginger in diet": "Thêm gừng vào chế biến món ăn hoặc uống trà gừng",
    "Include healthy fats": "Bổ sung chất béo thực vật không bão hòa",
    "Include high-fiber foods": "Tăng lượng chất xơ trong mỗi khẩu phần ăn",
    "Include iodine-rich foods": "Bổ sung thực phẩm chứa lượng iod thích hợp",
    "Include lean proteins": "Lựa chọn nguồn đạm nạc, ít cholesterol",
    "Include magnesium-rich foods": "Bổ sung magie từ các loại hạt và rau xanh thẫm",
    "Include nutrient-rich foods": "Bổ sung đầy đủ các vitamin và khoáng chất vi lượng",
    "Include omega-3 fatty acids": "Bổ sung Omega-3 hỗ trợ giảm viêm và tăng cường tuần hoàn",
    "Include potassium-rich foods": "Ăn thực phẩm giàu kali (chuối, khoai lang, nước dừa)",
    "Include protein-rich foods": "Đảm bảo cung cấp đủ lượng protein cần thiết cho cơ thể",
    "Include quercetin-rich foods": "Bổ sung quercetin từ hành tây, táo và trà xanh",
    "Include soft and easily digestible foods": "Ưu tiên các món ninh mềm, cháo súp dễ tiêu",
    "Include turmeric in diet": "Bổ sung nghệ trong chế biến món ăn để hỗ trợ chống viêm",
    "Include vitamin c-rich foods": "Bổ sung vitamin C giúp tăng hấp thu sắt và đề kháng",
    "Include vitamin d analogues": "Tham khảo bổ sung dẫn xuất vitamin D theo hướng dẫn chuyên khoa",
    "Include vitamin d-rich foods": "Bổ sung thực phẩm giàu vitamin D và tắm nắng sớm",
    "Include vitamin k-rich foods": "Bổ sung thực phẩm giàu vitamin K hỗ trợ quá trình đông máu",
    "Include yogurt in diet": "Ăn sữa chua mỗi ngày để cải thiện tiêu hóa và đường ruột",
    "Include zinc-rich foods": "Bổ sung kẽm hỗ trợ làm lành niêm mạc và tăng miễn dịch",
    "Increase intake of garlic": "Tăng cường dùng tỏi trong bữa ăn hàng ngày",
    "Limit alcohol consumption": "Hạn chế tối đa hoặc kiêng hẳn việc sử dụng rượu bia",
    "Limit alcohol intake": "Hạn chế đồ uống có cồn để bảo vệ gan và hệ thần kinh",
    "Limit artificial sweeteners": "Hạn chế dùng chất tạo ngọt nhân tạo",
    "Limit caffeine and alcohol": "Hạn chế cà phê, nước tăng lực và các chất có cồn",
    "Limit caffeine and stimulants": "Hạn chế các chất kích thích và caffeine gây mất ngủ",
    "Limit dairy and high-glycemic foods": "Hạn chế sữa động vật và thực phẩm làm tăng nhanh đường huyết",
    "Limit fatty and greasy foods": "Hạn chế các món chiên xào nhiều dầu mỡ",
    "Limit fatty foods": "Hạn chế mỡ động vật và thức ăn nhanh",
    "Limit iodine intake": "Hạn chế thực phẩm chứa nhiều iod nếu có chỉ định kiêng iod",
    "Limit processed foods": "Hạn chế tối đa thực phẩm đóng hộp, chế biến sẵn và đồ ăn nhanh",
    "Limit sodium intake": "Cắt giảm lượng muối và gia vị mặn trong khẩu phần ăn",
    "Limit sugary foods and beverages": "Hạn chế đồ ngọt, nước ngọt có ga và bánh kẹo",
    "Maintain a healthy weight": "Kiểm soát cân nặng hợp lý, tránh để tăng cân quá mức",
    "Maintain a stable weight": "Duy trì cân nặng ổn định, tránh sụt cân hoặc tăng cân đột ngột",
    "Maintain good hygiene": "Giữ gìn vệ sinh thân thể và môi trường xung quanh sạch sẽ",
    "Maintain regular meal times": "Ăn uống đúng giờ giấc, tránh bỏ bữa",
    "Manage stress": "Kiểm soát căng thẳng bằng thư giãn, nghe nhạc hoặc yoga",
    "Monitor blood sugar levels": "Kiểm tra và theo dõi chỉ số đường huyết định kỳ",
    "Monitor carbohydrate intake": "Kiểm soát lượng tinh bột đưa vào trong từng bữa ăn",
    "Practice good hygiene": "Thực hiện tốt các nguyên tắc vệ sinh cá nhân và ăn uống",
    "Practice good posture": "Duy trì tư thế đứng, ngồi thẳng lưng khoa học, tránh gù gập cổ",
    "Practice good skincare hygiene": "Chăm sóc và giữ vệ sinh da mặt sạch sẽ đúng cách",
    "Practice wound care": "Chăm sóc và vệ sinh vết thương ngoài da cẩn thận",
    "Rest and conserve energy": "Nghỉ ngơi yên tĩnh và hạn chế vận động gắng sức",
    "Stay hydrated": "Uống đủ nước lọc ấm trong suốt cả ngày (1.5 - 2 lít)",
    "Take prescribed antibiotics": "Uống kháng sinh đúng liều lượng và đủ ngày theo toa",
    "Take prescribed medications as directed": "Dùng thuốc điều trị đúng theo hướng dẫn của bác sĩ",
    "Take prescribed supplements": "Bổ sung các vi chất dinh dưỡng theo đúng chỉ định y khoa",
}


def translate_diet(raw: str) -> str:
    """Translate raw diet item to Vietnamese."""
    cap = raw.strip().capitalize()
    return DIET_TRANSLATIONS.get(cap, cap)


def translate_precaution(raw: str) -> str:
    """Translate raw precaution item to Vietnamese."""
    cap = raw.strip().capitalize()
    return PRECAUTION_TRANSLATIONS.get(cap, cap)


def translate_workout(raw: str) -> str:
    """Translate raw workout/activity item to Vietnamese."""
    cap = raw.strip().capitalize()
    return WORKOUT_TRANSLATIONS.get(cap, cap)


def build_lifestyle_kb(kb_dir: Path, raw_dir: Path) -> None:
    """Generate disease_lifestyle.csv from raw dataset diets, precautions, workouts."""
    diseases_file = kb_dir / "diseases.csv"
    if not diseases_file.exists():
        return

    df_diseases = pd.read_csv(diseases_file)
    canonical_diseases = {row["id"]: row["name_vi"] for _, row in df_diseases.iterrows()}

    # Helper to map disease names
    def norm_dis(name_str: str) -> str:
        s = str(name_str).strip().lower()
        if "vertigo" in s:
            return "vertigo_paroxysmal_positional_vertigo"
        if "osteoarthri" in s:
            return "osteoarthritis"
        if "peptic ulcer" in s:
            return "peptic_ulcer_disease"
        if "dimorphic" in s or "piles" in s:
            return "dimorphic_hemmorhoids_piles"
        if "diabetes" in s:
            return "diabetes"
        if "hypertension" in s:
            return "hypertension"
        return disease_to_id(name_str)

    disease_diets: dict[str, list[str]] = {did: [] for did in canonical_diseases}
    diets_file = raw_dir / "diets.csv"
    if diets_file.exists():
        df_diets = pd.read_csv(diets_file)
        for _, r in df_diets.iterrows():
            did = norm_dis(r["Disease"])
            if did in disease_diets:
                raw_val = r["Diet"]
                items: list[str] = []
                try:
                    items = [str(x).strip() for x in ast.literal_eval(raw_val) if str(x).strip()]
                except Exception:
                    items = [x.strip() for x in str(raw_val).split(",") if x.strip()]
                disease_diets[did] = [translate_diet(item) for item in items]

    disease_precautions: dict[str, list[str]] = {did: [] for did in canonical_diseases}
    prec_file = raw_dir / "precautions_df.csv"
    if prec_file.exists():
        df_prec = pd.read_csv(prec_file)
        for _, r in df_prec.iterrows():
            did = norm_dis(r["Disease"])
            if did in disease_precautions:
                items = []
                for col in ["Precaution_1", "Precaution_2", "Precaution_3", "Precaution_4"]:
                    val = r.get(col)
                    if pd.notna(val) and str(val).strip():
                        items.append(translate_precaution(str(val)))
                disease_precautions[did] = items

    disease_workouts: dict[str, list[str]] = {did: [] for did in canonical_diseases}
    work_file = raw_dir / "workout_df.csv"
    if work_file.exists():
        df_work = pd.read_csv(work_file)
        for _, r in df_work.iterrows():
            did = norm_dis(r["disease"])
            if did in disease_workouts:
                val = r["workout"]
                if pd.notna(val) and str(val).strip():
                    item = translate_workout(str(val))
                    if item not in disease_workouts[did]:
                        disease_workouts[did].append(item)

    output_rows = []
    for did, name_vi in canonical_diseases.items():
        diets = disease_diets.get(did, [])
        precautions = disease_precautions.get(did, [])
        workouts = disease_workouts.get(did, [])[:6]
        output_rows.append(
            {
                "disease_id": did,
                "disease_name_vi": name_vi,
                "diets": json.dumps(diets, ensure_ascii=False),
                "precautions": json.dumps(precautions, ensure_ascii=False),
                "workouts": json.dumps(workouts, ensure_ascii=False),
            }
        )

    out_file = kb_dir / "disease_lifestyle.csv"
    with open(out_file, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f, fieldnames=["disease_id", "disease_name_vi", "diets", "precautions", "workouts"]
        )
        writer.writeheader()
        writer.writerows(output_rows)
    logger.info(f"Created {out_file} ({len(output_rows)} entries)")


if __name__ == "__main__":
    build_kb_files()
