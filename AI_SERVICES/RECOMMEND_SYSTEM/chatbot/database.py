"""
Lớp truy vấn dữ liệu "nội bộ" phục vụ phần Rule-based của chatbot:
    - Danh sách chuyên khoa
    - Danh sách / thông tin bác sĩ
    - Lịch làm việc bác sĩ
    - Thông tin phòng khám

Có 2 chế độ (đặt trong .env qua biến DB_MODE):
    - "mock"  : SQLite giả lập, dùng để chạy thử độc lập.
    - "mysql" : kết nối MySQL thật (schema file clinic_full.sql, database `clinic`).

Schema MySQL thật được dùng:
    specialty(id, name, description)
    users(id, full_name, role, status, ...)
    doctor(id, user_id -> users.id, specialty_id -> specialty.id, experience, degree)
    doctor_schedule(id, doctor_id, day_of_week 1=Thứ 2 ... 7=Chủ nhật,
                    start_time, end_time, slot_duration, max_patient, status)
Chỉ lấy bác sĩ có users.status='ACTIVE' và lịch có status='ACTIVE'.
Bảng doctor_schedule KHÔNG có cột phòng nên trường "room" luôn là None.
"""
import os
import sqlite3
from typing import List, Dict, Optional

from . import config

CLINIC_INFO = {
    "name": "Phòng khám MediCare Hub",
    "address": "123 Đường Giải Phóng, Quận Hai Bà Trưng, Hà Nội",
    "phone": "024.1234.5678",
    "open_hours": "Thứ 2 - Thứ 7, 08:00 - 17:00 (nghỉ trưa 12:00 - 13:30)",
}


# ------------------------------------------------------------------
# MOCK (SQLite)
# ------------------------------------------------------------------
class MockRepository:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._ensure_seeded()

    def _connect(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_seeded(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        is_new = not os.path.exists(self.db_path)
        conn = self._connect()
        cur = conn.cursor()
        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS specialties (
                id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT
            );
            CREATE TABLE IF NOT EXISTS doctors (
                id INTEGER PRIMARY KEY, full_name TEXT NOT NULL, specialty_id INTEGER,
                degree TEXT, experience_years INTEGER
            );
            CREATE TABLE IF NOT EXISTS doctor_schedules (
                id INTEGER PRIMARY KEY, doctor_id INTEGER,
                day_of_week INTEGER,   -- 1=Thứ 2 ... 7=Chủ nhật
                start_time TEXT, end_time TEXT
            );
            """
        )
        if is_new:
            self._seed(cur)
        conn.commit()
        conn.close()

    def _seed(self, cur):
        cur.executemany(
            "INSERT INTO specialties VALUES (?,?,?)",
            [
                (1, "Nội tổng quát", "Khám và điều trị các bệnh lý nội khoa thông thường."),
                (2, "Nhi khoa", "Chăm sóc sức khỏe trẻ em từ sơ sinh đến 15 tuổi."),
                (3, "Da liễu", "Chẩn đoán và điều trị các bệnh về da, tóc, móng."),
                (4, "Tai Mũi Họng", "Chuyên khoa các bệnh lý tai, mũi, họng."),
                (5, "Tim mạch", "Tầm soát và điều trị các bệnh lý tim mạch."),
                (6, "Cơ xương khớp", "Điều trị các vấn đề về xương khớp, vận động."),
            ],
        )
        cur.executemany(
            "INSERT INTO doctors VALUES (?,?,?,?,?)",
            [
                (1, "BS.CKI Trần Thị Bình", 1, "Chuyên khoa I", 8),
                (2, "BS. Lê Văn Cường", 2, "Thạc sĩ", 6),
                (3, "BS.CKII Phạm Thu Hà", 3, "Chuyên khoa II", 12),
                (4, "BS. Nguyễn Đức Minh", 4, "Bác sĩ", 4),
                (5, "BS.CKI Đỗ Thanh Tùng", 5, "Chuyên khoa I", 10),
            ],
        )
        cur.executemany(
            "INSERT INTO doctor_schedules VALUES (?,?,?,?,?)",
            [
                (1, 1, 1, "08:00", "12:00"), (2, 1, 3, "08:00", "12:00"), (3, 1, 5, "13:30", "17:00"),
                (4, 2, 2, "08:00", "11:30"), (5, 2, 4, "13:30", "17:00"),
                (6, 3, 1, "13:30", "17:00"), (7, 3, 4, "08:00", "12:00"),
                (8, 4, 2, "13:30", "17:00"), (9, 4, 5, "08:00", "11:30"),
                (10, 5, 3, "13:30", "17:00"), (11, 5, 6, "08:00", "11:30"),
            ],
        )

    def get_specialties(self) -> List[str]:
        conn = self._connect()
        rows = conn.execute("SELECT name FROM specialties ORDER BY id").fetchall()
        conn.close()
        return [r["name"] for r in rows]

    def find_doctors_by_specialty(self, specialty_keyword: str) -> List[Dict]:
        conn = self._connect()
        rows = conn.execute(
            """SELECT d.full_name, d.degree, d.experience_years, s.name AS specialty
               FROM doctors d JOIN specialties s ON d.specialty_id = s.id
               WHERE s.name LIKE ?""",
            (f"%{specialty_keyword}%",),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def find_doctor_by_name(self, name_keyword: str) -> Optional[Dict]:
        conn = self._connect()
        row = conn.execute(
            """SELECT d.id, d.full_name, d.degree, d.experience_years,
                      s.description, s.name AS specialty
               FROM doctors d JOIN specialties s ON d.specialty_id = s.id
               WHERE d.full_name LIKE ? LIMIT 1""",
            (f"%{name_keyword}%",),
        ).fetchone()
        conn.close()
        return dict(row) if row else None

    def get_schedule_by_doctor_id(self, doctor_id: int) -> List[Dict]:
        conn = self._connect()
        rows = conn.execute(
            """SELECT day_of_week, start_time, end_time, NULL AS room
               FROM doctor_schedules WHERE doctor_id = ?
               ORDER BY day_of_week, start_time""",
            (doctor_id,),
        ).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_clinic_info(self) -> Dict[str, str]:
        return CLINIC_INFO


# ------------------------------------------------------------------
# MYSQL thật (database `clinic`)
# ------------------------------------------------------------------
class MySQLRepository:
    def __init__(self, mysql_config: dict):
        self.mysql_config = mysql_config

    def _connect(self):
        import mysql.connector
        return mysql.connector.connect(**self.mysql_config)

    def _query(self, sql: str, params=()) -> List[Dict]:
        conn = self._connect()
        try:
            cur = conn.cursor(dictionary=True)
            cur.execute(sql, params)
            rows = cur.fetchall()
            cur.close()
            return rows
        finally:
            conn.close()

    def get_specialties(self) -> List[str]:
        rows = self._query("SELECT name FROM specialty ORDER BY id")
        return [r["name"] for r in rows]

    def find_doctors_by_specialty(self, specialty_keyword: str) -> List[Dict]:
        return self._query(
            """SELECT u.full_name, d.degree, d.experience AS experience_years,
                      s.name AS specialty
               FROM doctor d
               JOIN users u ON d.user_id = u.id
               JOIN specialty s ON d.specialty_id = s.id
               WHERE s.name LIKE %s AND u.status = 'ACTIVE'""",
            (f"%{specialty_keyword}%",),
        )

    def find_doctor_by_name(self, name_keyword: str) -> Optional[Dict]:
        rows = self._query(
            """SELECT d.id, u.full_name, d.degree, d.experience AS experience_years,
                      s.description, s.name AS specialty
               FROM doctor d
               JOIN users u ON d.user_id = u.id
               JOIN specialty s ON d.specialty_id = s.id
               WHERE u.full_name LIKE %s AND u.status = 'ACTIVE'
               LIMIT 1""",
            (f"%{name_keyword}%",),
        )
        return rows[0] if rows else None

    def get_schedule_by_doctor_id(self, doctor_id: int) -> List[Dict]:
        # TIME_FORMAT: tránh mysql-connector trả TIME dạng timedelta
        return self._query(
            """SELECT day_of_week,
                      TIME_FORMAT(start_time, '%H:%i') AS start_time,
                      TIME_FORMAT(end_time, '%H:%i') AS end_time,
                      NULL AS room
               FROM doctor_schedule
               WHERE doctor_id = %s AND status = 'ACTIVE'
               ORDER BY day_of_week, start_time""",
            (doctor_id,),
        )

    def get_clinic_info(self) -> Dict[str, str]:
        # Schema chưa có bảng thông tin phòng khám -> dùng cấu hình cứng
        return CLINIC_INFO


class ResilientMySQLRepository:
    """Ủy thác cho MySQLRepository; nếu lỗi kết nối/query thì tự động fallback sang Mock SQLite."""
    def __init__(self, mysql_config: dict, fallback: MockRepository):
        self.mysql = MySQLRepository(mysql_config)
        self.fallback = fallback

    def get_specialties(self) -> List[str]:
        try:
            return self.mysql.get_specialties()
        except Exception as e:
            print(f"[chatbot.database] MySQL lỗi: {e}. Đang dùng dữ liệu dự phòng SQLite.")
            return self.fallback.get_specialties()

    def find_doctors_by_specialty(self, specialty_keyword: str) -> List[Dict]:
        try:
            return self.mysql.find_doctors_by_specialty(specialty_keyword)
        except Exception as e:
            print(f"[chatbot.database] MySQL lỗi: {e}. Đang dùng dữ liệu dự phòng SQLite.")
            return self.fallback.find_doctors_by_specialty(specialty_keyword)

    def find_doctor_by_name(self, name_keyword: str) -> Optional[Dict]:
        try:
            return self.mysql.find_doctor_by_name(name_keyword)
        except Exception as e:
            print(f"[chatbot.database] MySQL lỗi: {e}. Đang dùng dữ liệu dự phòng SQLite.")
            return self.fallback.find_doctor_by_name(name_keyword)

    def get_schedule_by_doctor_id(self, doctor_id: int) -> List[Dict]:
        try:
            return self.mysql.get_schedule_by_doctor_id(doctor_id)
        except Exception as e:
            print(f"[chatbot.database] MySQL lỗi: {e}. Đang dùng dữ liệu dự phòng SQLite.")
            return self.fallback.get_schedule_by_doctor_id(doctor_id)

    def get_clinic_info(self) -> Dict[str, str]:
        return self.mysql.get_clinic_info()


def get_repository():
    mock_repo = MockRepository(config.MOCK_DB_PATH)
    if config.DB_MODE == "mysql":
        return ResilientMySQLRepository(config.MYSQL_CONFIG, mock_repo)
    return mock_repo
