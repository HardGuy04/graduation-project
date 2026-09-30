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
        "aliases": "sot cao;sot nong;nhiet do cao;sot tren 38 do;sot cao lien tuc",
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
        desc = desc_map.get(raw_name.strip(), desc_map.get(str(meta["name_vi"]), ""))
        if not desc:
            # Fallback fuzzy match
            for k, v in desc_map.items():
                if disease_to_id(k) == str(meta["id"]):
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

                medicine_dict[med_id] = {
                    "id": med_id,
                    "name": med_name_clean,
                    "active_ingredient": med_name_clean,
                    "group": grp,
                    "usage": f"Chỉ định hỗ trợ và điều trị theo phác đồ cho {raw_dis}. Bác sĩ xác định liều lượng theo thể trạng bệnh nhân.",
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


if __name__ == "__main__":
    build_kb_files()
