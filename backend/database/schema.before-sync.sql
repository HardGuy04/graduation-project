-- ═══════════════════════════════════════════════════════════════════════════
-- MediCare Hub — Schema SQL (đã dùng để tạo bảng)
-- Database: clinic — MySQL 8.0+ (InnoDB, utf8mb4)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS clinic
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE clinic;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS refresh_tokens, notification, wallet_transaction, wallet,
  invoice_detail, invoice, prescription_detail, prescription, medical_record,
  appointment, income, doctor_leave, doctor_schedule, admin_profile, patient,
  doctor, room, specialty, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. Tài khoản (do Auth service quản lý)
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NULL,
  email         VARCHAR(255) NOT NULL,
  phone         VARCHAR(20)  NULL,
  password      VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  avatar_url    VARCHAR(500) NULL,
  role          ENUM('admin','doctor','patient') NOT NULL,
  status        ENUM('active','locked','disabled') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_users_username UNIQUE (username),
  CONSTRAINT uq_users_email    UNIQUE (email)
) ENGINE=InnoDB;

CREATE TABLE refresh_tokens (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  family_id   CHAR(36)  NOT NULL,          -- UUID, dùng cho reuse detection
  token_hash  CHAR(64)  NOT NULL,          -- SHA-256 của token
  used_at     DATETIME  NULL,
  revoked_at  DATETIME  NULL,
  expires_at  DATETIME  NOT NULL,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash),
  INDEX idx_refresh_user (user_id),
  INDEX idx_refresh_family (family_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. Danh mục
-- ---------------------------------------------------------------------
CREATE TABLE specialty (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  icon        VARCHAR(100) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_specialty_name UNIQUE (name)
) ENGINE=InnoDB;

CREATE TABLE room (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  floor      VARCHAR(50)  NULL,
  status     ENUM('available','in_use','maintenance') NOT NULL DEFAULT 'available',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_room_name UNIQUE (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. Hồ sơ theo vai trò (1-1 với users)
-- ---------------------------------------------------------------------
CREATE TABLE doctor (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          BIGINT UNSIGNED NOT NULL,
  specialty_id     BIGINT UNSIGNED NOT NULL,
  degree           VARCHAR(255) NULL,
  experience_years INT UNSIGNED NOT NULL DEFAULT 0,
  description      TEXT NULL,
  avatar_color     VARCHAR(20)  NULL,
  base_salary      DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_doctor_user UNIQUE (user_id),
  INDEX idx_doctor_specialty (specialty_id),
  CONSTRAINT fk_doctor_user      FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctor_specialty FOREIGN KEY (specialty_id) REFERENCES specialty(id)
) ENGINE=InnoDB;

CREATE TABLE patient (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED NOT NULL,
  date_of_birth DATE NULL,
  gender        ENUM('male','female','other') NULL,
  address       VARCHAR(500) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_patient_user UNIQUE (user_id),
  CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE admin_profile (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  position   VARCHAR(100) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_admin_user UNIQUE (user_id),
  CONSTRAINT fk_admin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. Lịch làm việc bác sĩ
-- ---------------------------------------------------------------------
CREATE TABLE doctor_schedule (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id     BIGINT UNSIGNED NOT NULL,
  day_of_week   TINYINT UNSIGNED NOT NULL,        -- 1=Thứ 2 ... 7=Chủ nhật
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  slot_duration SMALLINT UNSIGNED NOT NULL,       -- phút
  max_patients  SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  room          VARCHAR(100) NULL,
  status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_schedule UNIQUE (doctor_id, day_of_week, start_time),
  CONSTRAINT ck_schedule_dow  CHECK (day_of_week BETWEEN 1 AND 7),
  CONSTRAINT ck_schedule_time CHECK (end_time > start_time),
  CONSTRAINT fk_schedule_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE doctor_leave (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id  BIGINT UNSIGNED NOT NULL,
  date       DATE NOT NULL,
  reason     VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_leave UNIQUE (doctor_id, date),
  CONSTRAINT fk_leave_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE income (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  doctor_id    BIGINT UNSIGNED NOT NULL,
  period_month DATE NOT NULL,                     -- ngày 1 của tháng
  salary       DECIMAL(12,2) NOT NULL DEFAULT 0,
  day_on       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  day_off      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  received     DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_income UNIQUE (doctor_id, period_month),
  CONSTRAINT fk_income_doctor FOREIGN KEY (doctor_id) REFERENCES doctor(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. Lịch khám
-- ---------------------------------------------------------------------
CREATE TABLE appointment (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id BIGINT UNSIGNED NOT NULL,
  doctor_id  BIGINT UNSIGNED NOT NULL,
  admin_id   BIGINT UNSIGNED NULL,
  room_id    BIGINT UNSIGNED NULL,
  date       DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time   TIME NOT NULL,
  status     ENUM('pending','confirmed','in_progress','completed','cancelled','rejected')
             NOT NULL DEFAULT 'pending',
  reason     VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Khóa chống trùng: chỉ có giá trị khi lịch còn hiệu lực (NULL không bị unique chặn)
  active_doctor_slot VARCHAR(64) GENERATED ALWAYS AS (
    IF(status IN ('cancelled','rejected'), NULL, CONCAT(doctor_id, '_', date, '_', start_time))
  ) STORED,
  active_room_slot VARCHAR(64) GENERATED ALWAYS AS (
    IF(status IN ('cancelled','rejected') OR room_id IS NULL, NULL,
       CONCAT(room_id, '_', date, '_', start_time))
  ) STORED,

  CONSTRAINT uq_active_doctor_slot UNIQUE (active_doctor_slot),
  CONSTRAINT uq_active_room_slot   UNIQUE (active_room_slot),
  CONSTRAINT ck_appt_time CHECK (end_time > start_time),
  INDEX idx_appt_patient (patient_id, date),
  INDEX idx_appt_doctor  (doctor_id, date),
  INDEX idx_appt_status  (status, date),

  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patient(id),
  CONSTRAINT fk_appt_doctor  FOREIGN KEY (doctor_id)  REFERENCES doctor(id),
  CONSTRAINT fk_appt_admin   FOREIGN KEY (admin_id)   REFERENCES admin_profile(id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_room    FOREIGN KEY (room_id)    REFERENCES room(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. Bệnh án & đơn thuốc
-- ---------------------------------------------------------------------
CREATE TABLE medical_record (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT UNSIGNED NOT NULL,
  patient_id     BIGINT UNSIGNED NOT NULL,
  doctor_id      BIGINT UNSIGNED NOT NULL,
  symptoms       TEXT NULL,
  diagnosis      TEXT NULL,
  notes          TEXT NULL,
  follow_up_date DATE NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_record_appointment UNIQUE (appointment_id),
  INDEX idx_record_patient (patient_id),
  INDEX idx_record_doctor  (doctor_id),
  CONSTRAINT fk_record_appointment FOREIGN KEY (appointment_id)
    REFERENCES appointment(id),
  CONSTRAINT fk_record_patient FOREIGN KEY (patient_id)
    REFERENCES patient(id),
  CONSTRAINT fk_record_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctor(id)
) ENGINE=InnoDB;

CREATE TABLE prescription (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  medical_record_id BIGINT UNSIGNED NOT NULL,
  note              VARCHAR(255) NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_prescription_record UNIQUE (medical_record_id),
  CONSTRAINT fk_prescription_record FOREIGN KEY (medical_record_id)
    REFERENCES medical_record(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE prescription_detail (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prescription_id   BIGINT UNSIGNED NOT NULL,
  medicine_name     VARCHAR(255) NOT NULL,
  dosage            VARCHAR(255) NULL,
  quantity          INT UNSIGNED NOT NULL,
  usage_instruction VARCHAR(255) NULL,
  INDEX idx_pdetail_prescription (prescription_id),
  CONSTRAINT fk_pdetail_prescription FOREIGN KEY (prescription_id)
    REFERENCES prescription(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. Hóa đơn & ví
-- ---------------------------------------------------------------------
CREATE TABLE invoice (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  appointment_id BIGINT UNSIGNED NOT NULL,
  patient_id     BIGINT UNSIGNED NOT NULL,
  amount         DECIMAL(12,2) NOT NULL DEFAULT 0,
  status         ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
  payment_method ENUM('cash','card','transfer','wallet') NULL,
  paid_at        DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_invoice_appointment UNIQUE (appointment_id),
  CONSTRAINT ck_invoice_amount CHECK (amount >= 0),
  INDEX idx_invoice_patient (patient_id),
  CONSTRAINT fk_invoice_appointment FOREIGN KEY (appointment_id)
    REFERENCES appointment(id),
  CONSTRAINT fk_invoice_patient FOREIGN KEY (patient_id)
    REFERENCES patient(id)
) ENGINE=InnoDB;

CREATE TABLE invoice_detail (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  invoice_id BIGINT UNSIGNED NOT NULL,
  label      VARCHAR(255) NOT NULL,
  amount     DECIMAL(12,2) NOT NULL,
  INDEX idx_idetail_invoice (invoice_id),
  CONSTRAINT fk_idetail_invoice FOREIGN KEY (invoice_id)
    REFERENCES invoice(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wallet (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id BIGINT UNSIGNED NOT NULL,
  balance    DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_wallet_patient UNIQUE (patient_id),
  CONSTRAINT ck_wallet_balance CHECK (balance >= 0),
  CONSTRAINT fk_wallet_patient FOREIGN KEY (patient_id) REFERENCES patient(id)
) ENGINE=InnoDB;

-- Sổ cái: mọi biến động số dư đều ghi lại ở đây
CREATE TABLE wallet_transaction (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wallet_id     BIGINT UNSIGNED NOT NULL,
  invoice_id    BIGINT UNSIGNED NULL,
  type          ENUM('topup','payment','refund') NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wtx_wallet (wallet_id, created_at),
  CONSTRAINT fk_wtx_wallet  FOREIGN KEY (wallet_id)  REFERENCES wallet(id),
  CONSTRAINT fk_wtx_invoice FOREIGN KEY (invoice_id) REFERENCES invoice(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. Thông báo
-- ---------------------------------------------------------------------
CREATE TABLE notification (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id     BIGINT UNSIGNED NOT NULL,
  appointment_id BIGINT UNSIGNED NULL,
  type           VARCHAR(30)  NOT NULL,           -- appointment_confirmed, appointment_rejected, appointment_cancelled...
  text           VARCHAR(255) NOT NULL,
  is_read        TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_notif_patient (patient_id, is_read),
  CONSTRAINT fk_notif_patient     FOREIGN KEY (patient_id)     REFERENCES patient(id),
  CONSTRAINT fk_notif_appointment FOREIGN KEY (appointment_id) REFERENCES appointment(id)
    ON DELETE SET NULL
) ENGINE=InnoDB;
