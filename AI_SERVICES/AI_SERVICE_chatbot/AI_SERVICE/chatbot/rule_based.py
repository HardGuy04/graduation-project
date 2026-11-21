"""
Xử lý theo hướng Rule-based: nhận diện các câu hỏi liên quan tới DỮ LIỆU NỘI BỘ
của phòng khám (chuyên khoa, bác sĩ, lịch làm việc, thông tin phòng khám) và
truy vấn trực tiếp từ cơ sở dữ liệu (mock SQLite khi test, MySQL thật khi đã
tích hợp vào dự án chính) để trả lời chính xác, không cần qua model AI.

Đây là lớp được ưu tiên kiểm tra TRƯỚC khi chuyển câu hỏi sang mô hình phân
loại ý định (intent_classifier) dùng cho kiến thức y tế chung.
"""
import re
from typing import Optional

from . import database

_DAY_NAMES = {
    0: "Chủ nhật",
    7: "Chủ nhật",
    1: "Thứ 2",
    2: "Thứ 3",
    3: "Thứ 4",
    4: "Thứ 5",
    5: "Thứ 6",
    6: "Thứ 7",
}


def _day_name(day_of_week: int) -> str:
    return _DAY_NAMES.get(day_of_week, f"Ngày {day_of_week}")


def _extract_doctor_name(raw_text: str) -> Optional[str]:
    """Trích thô tên bác sĩ được nhắc tới, ví dụ:
    'lịch làm việc của bác sĩ Nguyễn Văn An' -> 'Nguyễn Văn An'
    Đây là cách trích xuất đơn giản (heuristic), đủ dùng cho demo/test;
    có thể nâng cấp bằng NER tiếng Việt ở phiên bản sau.
    """
    m = re.search(r"b[áa]c\s*s[ĩi]\.?\s+([^\?\.,!]+)", raw_text, re.IGNORECASE)
    if not m:
        m = re.search(r"\bbs\.?\s+([^\?\.,!]+)", raw_text, re.IGNORECASE)
    if not m:
        return None
    candidate = m.group(1).strip()
    # cắt bỏ phần đuôi là các cụm hỏi thường gặp, chỉ giữ lại phần tên
    candidate = re.split(
        r"\b(làm việc|khám|có lịch|lịch|chuyên khoa|thông tin|là ai|ở đâu)\b",
        candidate,
        flags=re.IGNORECASE,
    )[0].strip()

    # Loại các từ để hỏi chung chung (không phải tên riêng) bị bắt nhầm,
    # ví dụ: "bác sĩ nào chuyên khoa Tim mạch?" -> candidate="nào" (không hợp lệ)
    _NON_NAME_WORDS = {"nào", "gì", "ai", "đó", "này", "ấy", "nao", "gi", "ai đó"}
    if not candidate or candidate.lower() in _NON_NAME_WORDS:
        return None
    return candidate


def _match_specialty_keyword(text_norm: str, specialties) -> Optional[str]:
    for name in specialties:
        if name.lower() in text_norm:
            return name
    return None


def try_answer(raw_text: str, text_norm: str) -> Optional[str]:
    """Thử trả lời bằng rule-based. Trả về None nếu câu hỏi không thuộc
    phạm vi dữ liệu nội bộ (khi đó sẽ được chuyển sang model AI)."""
    repo = database.get_repository()

    # --- 1. Thông tin phòng khám ---
    if any(k in text_norm for k in ["địa chỉ phòng khám", "phòng khám ở đâu", "phòng khám nằm ở đâu"]):
        info = repo.get_clinic_info()
        return f"{info['name']} có địa chỉ tại {info['address']}."

    if any(k in text_norm for k in ["số điện thoại phòng khám", "hotline phòng khám", "liên hệ phòng khám", "sđt phòng khám"]):
        info = repo.get_clinic_info()
        return f"Bạn có thể liên hệ phòng khám qua số điện thoại {info['phone']}."

    if any(k in text_norm for k in ["giờ làm việc phòng khám", "phòng khám mở cửa", "phòng khám làm việc giờ nào", "phòng khám mở giờ nào"]):
        info = repo.get_clinic_info()
        return f"Phòng khám làm việc theo khung giờ: {info['open_hours']}."

    if "thông tin phòng khám" in text_norm:
        info = repo.get_clinic_info()
        return (
            f"{info['name']} - Địa chỉ: {info['address']} - "
            f"Điện thoại: {info['phone']} - Giờ làm việc: {info['open_hours']}."
        )

    # --- 2. Bác sĩ theo tên (thông tin / lịch làm việc) ---
    doctor_name = _extract_doctor_name(raw_text)
    if doctor_name:
        doctor = repo.find_doctor_by_name(doctor_name)
        if doctor:
            wants_schedule = any(
                k in text_norm
                for k in ["lịch làm việc", "lịch khám", "làm việc ngày nào", "khám ngày nào", "lịch trực", "làm việc thứ mấy"]
            )
            if wants_schedule:
                schedule = repo.get_schedule_by_doctor_id(doctor["id"])
                if schedule:
                    lines = [
                        f"{_day_name(s['day_of_week'])}: {s['start_time']} - {s['end_time']}"
                        + (f" tại {s['room']}" if s.get('room') else "")
                        for s in schedule
                    ]
                    return f"Lịch làm việc của {doctor['full_name']}:\n- " + "\n- ".join(lines)
                return f"Hiện chưa có lịch làm việc được cập nhật cho {doctor['full_name']}."
            return (
                f"{doctor['full_name']} - {doctor['degree']}, {doctor['experience_years']} năm kinh nghiệm, "
                f"chuyên khoa {doctor['specialty']}. {doctor.get('description') or ''}"
            ).strip()
        # Có nhắc "bác sĩ ..." nhưng không tìm thấy trong hệ thống
        return f"Xin lỗi, tôi không tìm thấy thông tin bác sĩ '{doctor_name}' trong hệ thống. Bạn vui lòng kiểm tra lại tên bác sĩ."

    # --- 3. Danh sách bác sĩ theo chuyên khoa ---
    specialties = repo.get_specialties()
    specialty_kw = _match_specialty_keyword(text_norm, specialties)
    if specialty_kw and any(k in text_norm for k in ["bác sĩ", "bs "]):
        doctors = repo.find_doctors_by_specialty(specialty_kw)
        if doctors:
            lines = [
                f"{d['full_name']} ({d['degree']}, {d['experience_years']} năm kinh nghiệm)"
                for d in doctors
            ]
            return f"Các bác sĩ chuyên khoa {specialty_kw}:\n- " + "\n- ".join(lines)

    # --- 4. Danh sách chuyên khoa của phòng khám ---
    if "chuyên khoa" in text_norm:
        return "Phòng khám hiện có các chuyên khoa: " + ", ".join(specialties) + "."

    return None
