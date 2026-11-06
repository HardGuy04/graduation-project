-- ═══════════════════════════════════════════════════════════════════════════
-- MediCare Hub — schema + dữ liệu mẫu (1 file)
-- Nguồn: database/schema.sql + dữ liệu seed đã chỉnh khớp schema hiện tại
-- (seed.sql gốc theo schema mock cũ nên KHÔNG ghép nguyên văn)
--
-- Chạy (MySQL root / tài khoản có quyền CREATE):
--   mysql -u root -p < database/clinic_full.sql
--
-- Mật khẩu mặc định mọi tài khoản demo: 123456
-- File này DROP DATABASE clinic rồi tạo lại từ đầu (mất dữ liệu cũ).
-- Migration 001–003 chưa gộp — chạy thêm nếu cần đủ tính năng mới.
-- ═══════════════════════════════════════════════════════════════════════════

SET NAMES utf8mb4;
SET time_zone = '+00:00';

DROP DATABASE IF EXISTS `clinic`;
CREATE DATABASE `clinic`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `clinic`;

-- ---------------------------------------------------------------------
-- 1. Tài khoản & token
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `role` enum('ADMIN','DOCTOR','PATIENT') NOT NULL,
  `status` enum('ACTIVE','LOCKED','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `refresh_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `family_id` char(36) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_refresh_token_hash` (`token_hash`),
  KEY `idx_refresh_user` (`user_id`),
  KEY `idx_refresh_family` (`family_id`),
  CONSTRAINT `fk_refresh_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 2. Danh mục
-- ---------------------------------------------------------------------
CREATE TABLE `specialty` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_specialty_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `room` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `status` enum('AVAILABLE','MAINTENANCE','INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 3. Hồ sơ theo vai trò (1-1 với users)
-- ---------------------------------------------------------------------
CREATE TABLE `admin_profile` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `position` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_user` (`user_id`),
  CONSTRAINT `fk_admin_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctor` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `specialty_id` bigint unsigned NOT NULL,
  `experience` int unsigned NOT NULL DEFAULT '0',
  `degree` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_doctor_user` (`user_id`),
  KEY `idx_doctor_specialty` (`specialty_id`),
  CONSTRAINT `fk_doctor_specialty` FOREIGN KEY (`specialty_id`) REFERENCES `specialty` (`id`),
  CONSTRAINT `fk_doctor_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `patient` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('MALE','FEMALE','OTHER') DEFAULT NULL,
  `address` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_patient_user` (`user_id`),
  CONSTRAINT `fk_patient_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 4. Lịch làm việc, ngày nghỉ, thu nhập bác sĩ
-- ---------------------------------------------------------------------
-- day_of_week: 1 = Thứ 2 ... 7 = Chủ nhật; start_time/end_time là giờ địa phương phòng khám
CREATE TABLE `doctor_schedule` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `doctor_id` bigint unsigned NOT NULL,
  `day_of_week` tinyint unsigned NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `slot_duration` smallint unsigned NOT NULL,
  `max_patient` smallint unsigned NOT NULL DEFAULT '1',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_schedule` (`doctor_id`,`day_of_week`,`start_time`),
  CONSTRAINT `fk_schedule_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`id`),
  CONSTRAINT `ck_schedule_dow` CHECK ((`day_of_week` between 1 and 7)),
  CONSTRAINT `ck_schedule_time` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `doctor_leave` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `doctor_id` bigint unsigned NOT NULL,
  `leave_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_leave` (`doctor_id`,`leave_date`),
  CONSTRAINT `fk_leave_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `income` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `doctor_id` bigint unsigned NOT NULL,
  `period_month` date NOT NULL,
  `salary` decimal(12,2) NOT NULL DEFAULT '0.00',
  `day_on` smallint unsigned NOT NULL DEFAULT '0',
  `day_off` smallint unsigned NOT NULL DEFAULT '0',
  `received` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_income` (`doctor_id`,`period_month`),
  CONSTRAINT `fk_income_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 5. Lịch khám (DATETIME lưu UTC)
-- ---------------------------------------------------------------------
-- Cột sinh active_*_slot = NULL khi CANCELLED/NO_SHOW nên lịch hủy giải phóng slot;
-- unique index chỉ chặn trùng ĐÚNG giờ bắt đầu, chồng lấn lệch giờ do service kiểm tra.
CREATE TABLE `appointment` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint unsigned NOT NULL,
  `doctor_id` bigint unsigned NOT NULL,
  `admin_id` bigint unsigned DEFAULT NULL,
  `room_id` bigint unsigned DEFAULT NULL,
  `start_at` datetime NOT NULL,
  `end_at` datetime NOT NULL,
  `status` enum('PENDING','CONFIRMED','CHECKED_IN','DONE','CANCELLED','NO_SHOW') NOT NULL DEFAULT 'PENDING',
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `active_doctor_slot` varchar(64) GENERATED ALWAYS AS (if((`status` in (_utf8mb4'CANCELLED',_utf8mb4'NO_SHOW')),NULL,concat(`doctor_id`,_utf8mb4'_',`start_at`))) STORED,
  `active_room_slot` varchar(64) GENERATED ALWAYS AS (if(((`status` in (_utf8mb4'CANCELLED',_utf8mb4'NO_SHOW')) or (`room_id` is null)),NULL,concat(`room_id`,_utf8mb4'_',`start_at`))) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_active_doctor_slot` (`active_doctor_slot`),
  UNIQUE KEY `uq_active_room_slot` (`active_room_slot`),
  KEY `idx_appt_patient` (`patient_id`,`start_at`),
  KEY `idx_appt_doctor` (`doctor_id`,`start_at`),
  KEY `idx_appt_status` (`status`,`start_at`),
  KEY `fk_appt_admin` (`admin_id`),
  KEY `fk_appt_room` (`room_id`),
  CONSTRAINT `fk_appt_admin` FOREIGN KEY (`admin_id`) REFERENCES `admin_profile` (`id`),
  CONSTRAINT `fk_appt_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctor` (`id`),
  CONSTRAINT `fk_appt_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`),
  CONSTRAINT `fk_appt_room` FOREIGN KEY (`room_id`) REFERENCES `room` (`id`),
  CONSTRAINT `ck_appt_time` CHECK ((`end_at` > `start_at`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 6. Bệnh án & đơn thuốc (mỗi lịch khám tối đa 1 bệnh án, mỗi bệnh án tối đa 1 đơn)
-- ---------------------------------------------------------------------
CREATE TABLE `medical_record` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `symptoms` text,
  `diagnosis` text,
  `note` text,
  `follow_up_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_record_appointment` (`appointment_id`),
  CONSTRAINT `fk_record_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `prescription` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `medical_record_id` bigint unsigned NOT NULL,
  `note` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_prescription_record` (`medical_record_id`),
  CONSTRAINT `fk_prescription_record` FOREIGN KEY (`medical_record_id`) REFERENCES `medical_record` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `prescription_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `prescription_id` bigint unsigned NOT NULL,
  `medicine_name` varchar(255) NOT NULL,
  `dosage` varchar(255) DEFAULT NULL,
  `quantity` int unsigned NOT NULL,
  `usage_instruction` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pdetail_prescription` (`prescription_id`),
  CONSTRAINT `fk_pdetail_prescription` FOREIGN KEY (`prescription_id`) REFERENCES `prescription` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 7. Hóa đơn & ví (tiền là DECIMAL; mọi biến động số dư ghi vào wallet_transaction)
-- ---------------------------------------------------------------------
CREATE TABLE `invoice` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `appointment_id` bigint unsigned NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('UNPAID','PAID','REFUNDED') NOT NULL DEFAULT 'UNPAID',
  `payment_method` enum('CASH','CARD','TRANSFER','WALLET') DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_invoice_appointment` (`appointment_id`),
  CONSTRAINT `fk_invoice_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`),
  CONSTRAINT `ck_invoice_total` CHECK ((`total_amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `invoice_detail` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `invoice_id` bigint unsigned NOT NULL,
  `label` varchar(255) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_idetail_invoice` (`invoice_id`),
  CONSTRAINT `fk_idetail_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `wallet` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint unsigned NOT NULL,
  `balance` decimal(12,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wallet_patient` (`patient_id`),
  CONSTRAINT `fk_wallet_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`),
  CONSTRAINT `ck_wallet_balance` CHECK ((`balance` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `wallet_transaction` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wallet_id` bigint unsigned NOT NULL,
  `invoice_id` bigint unsigned DEFAULT NULL,
  `type` enum('TOPUP','PAYMENT','REFUND') NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `balance_after` decimal(12,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_wtx_wallet` (`wallet_id`,`created_at`),
  KEY `fk_wtx_invoice` (`invoice_id`),
  CONSTRAINT `fk_wtx_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`),
  CONSTRAINT `fk_wtx_wallet` FOREIGN KEY (`wallet_id`) REFERENCES `wallet` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------
-- 8. Thông báo (chỉ dành cho bệnh nhân)
-- ---------------------------------------------------------------------
CREATE TABLE `notification` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint unsigned NOT NULL,
  `appointment_id` bigint unsigned DEFAULT NULL,
  `type` varchar(30) NOT NULL,
  `text` varchar(255) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_patient` (`patient_id`,`is_read`),
  KEY `fk_notif_appointment` (`appointment_id`),
  CONSTRAINT `fk_notif_appointment` FOREIGN KEY (`appointment_id`) REFERENCES `appointment` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_notif_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ═══════════════════════════════════════════════════════════════════════════
-- PHẦN 2 — Dữ liệu mẫu (khớp schema hiện tại)
-- Mật khẩu mặc định: 123456
-- Giờ lịch hẹn lưu UTC (= giờ phòng khám +07 trừ 7 giờ; không phụ thuộc bảng timezone MySQL)
-- ═══════════════════════════════════════════════════════════════════════════

SET FOREIGN_KEY_CHECKS = 0;

SET @pwd = '$2b$10$l1YHjI5Z2RMP1W8qfoXl5eEVInIQEIIiPcu/67Q1Kb3gA79bo5OZu';

INSERT INTO `specialty` (`id`, `name`, `description`) VALUES
  (1, 'Nội tổng quát', 'Khám và điều trị các bệnh lý nội khoa thông thường.'),
  (2, 'Nhi khoa', 'Chăm sóc sức khỏe trẻ em từ sơ sinh đến 15 tuổi.'),
  (3, 'Da liễu', 'Chẩn đoán và điều trị các bệnh về da, tóc, móng.'),
  (4, 'Tai Mũi Họng', 'Chuyên khoa các bệnh lý tai, mũi, họng.'),
  (5, 'Tim mạch', 'Tầm soát và điều trị các bệnh lý tim mạch.'),
  (6, 'Cơ xương khớp', 'Điều trị các vấn đề về xương khớp, vận động.');

INSERT INTO `room` (`id`, `name`, `status`) VALUES
  (1, 'Phòng khám 101', 'AVAILABLE'),
  (2, 'Phòng khám 102', 'AVAILABLE'),
  (3, 'Phòng khám 103', 'AVAILABLE'),
  (4, 'Phòng khám Nhi', 'AVAILABLE'),
  (5, 'Phòng xét nghiệm', 'MAINTENANCE'),
  (6, 'Phòng tiểu phẫu', 'AVAILABLE');

INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password_hash`, `full_name`, `role`, `status`) VALUES
  (1, 'admin@medicare.vn', 'admin@medicare.vn', '0900000000', @pwd, 'Quản trị viên Mai Lan', 'ADMIN', 'ACTIVE'),
  (101, 'tranthib@medicare.vn', 'tranthib@medicare.vn', '0987654321', @pwd, 'BS.CKI Trần Thị Bình', 'DOCTOR', 'ACTIVE'),
  (102, 'levancuong@medicare.vn', 'levancuong@medicare.vn', '0912233445', @pwd, 'BS. Lê Văn Cường', 'DOCTOR', 'ACTIVE'),
  (103, 'phamthuha@medicare.vn', 'phamthuha@medicare.vn', '0977889900', @pwd, 'BS.CKII Phạm Thu Hà', 'DOCTOR', 'ACTIVE'),
  (104, 'nguyenducminh@medicare.vn', 'nguyenducminh@medicare.vn', '0966554433', @pwd, 'BS. Nguyễn Đức Minh', 'DOCTOR', 'ACTIVE'),
  (105, 'dothanhtung@medicare.vn', 'dothanhtung@medicare.vn', '0933221100', @pwd, 'BS.CKI Đỗ Thanh Tùng', 'DOCTOR', 'ACTIVE'),
  (106, 'vungoclan@medicare.vn', 'vungoclan@medicare.vn', '0944556677', @pwd, 'BS. Vũ Ngọc Lan', 'DOCTOR', 'LOCKED'),
  (201, 'nguyenvanan@gmail.com', 'nguyenvanan@gmail.com', '0912345678', @pwd, 'Nguyễn Văn An', 'PATIENT', 'ACTIVE'),
  (202, 'tranthibich@gmail.com', 'tranthibich@gmail.com', '0923456789', @pwd, 'Trần Thị Bích', 'PATIENT', 'ACTIVE'),
  (203, 'lehoangnam@gmail.com', 'lehoangnam@gmail.com', '0934567890', @pwd, 'Lê Hoàng Nam', 'PATIENT', 'ACTIVE'),
  (204, 'phamthiduyen@gmail.com', 'phamthiduyen@gmail.com', '0945678901', @pwd, 'Phạm Thị Duyên', 'PATIENT', 'ACTIVE'),
  (205, 'hoangminhduc@gmail.com', 'hoangminhduc@gmail.com', '0956789012', @pwd, 'Hoàng Minh Đức', 'PATIENT', 'ACTIVE'),
  (206, 'dangthutrang@gmail.com', 'dangthutrang@gmail.com', '0967890123', @pwd, 'Đặng Thu Trang', 'PATIENT', 'ACTIVE'),
  (207, 'buianhtuan@gmail.com', 'buianhtuan@gmail.com', '0978901234', @pwd, 'Bùi Anh Tuấn', 'PATIENT', 'ACTIVE'),
  (208, 'vuthimai@gmail.com', 'vuthimai@gmail.com', '0989012345', @pwd, 'Vũ Thị Mai', 'PATIENT', 'LOCKED'),
  (209, 'ngoquocbao@gmail.com', 'ngoquocbao@gmail.com', '0990123456', @pwd, 'Ngô Quốc Bảo', 'PATIENT', 'ACTIVE'),
  (210, 'dinhkhanhlinh@gmail.com', 'dinhkhanhlinh@gmail.com', '0901234567', @pwd, 'Đinh Khánh Linh', 'PATIENT', 'ACTIVE');

INSERT INTO `admin_profile` (`id`, `user_id`, `position`) VALUES
  (1, 1, 'Lễ tân / Quản trị');

INSERT INTO `doctor` (`id`, `user_id`, `specialty_id`, `experience`, `degree`) VALUES
  (1, 101, 1, 8, 'Chuyên khoa I'),
  (2, 102, 2, 6, 'Thạc sĩ'),
  (3, 103, 3, 12, 'Chuyên khoa II'),
  (4, 104, 4, 4, 'Bác sĩ'),
  (5, 105, 5, 10, 'Chuyên khoa I'),
  (6, 106, 6, 5, 'Thạc sĩ');

INSERT INTO `patient` (`id`, `user_id`, `date_of_birth`, `gender`, `address`) VALUES
  (1, 201, '1990-05-15', 'MALE', 'Cầu Giấy, Hà Nội'),
  (2, 202, '1985-11-02', 'FEMALE', 'Đống Đa, Hà Nội'),
  (3, 203, '2001-02-20', 'MALE', 'Hai Bà Trưng, Hà Nội'),
  (4, 204, '1998-08-09', 'FEMALE', 'Thanh Xuân, Hà Nội'),
  (5, 205, '1975-03-30', 'MALE', 'Ba Đình, Hà Nội'),
  (6, 206, '1993-12-12', 'FEMALE', 'Long Biên, Hà Nội'),
  (7, 207, '2015-07-18', 'MALE', 'Nam Từ Liêm, Hà Nội'),
  (8, 208, '1988-09-25', 'FEMALE', 'Hoàng Mai, Hà Nội'),
  (9, 209, '1999-01-05', 'MALE', 'Tây Hồ, Hà Nội'),
  (10, 210, '1996-06-14', 'FEMALE', 'Cầu Giấy, Hà Nội');

INSERT INTO `wallet` (`patient_id`, `balance`) VALUES
  (1, 5000000.00), (2, 12000000.00), (3, 800000.00), (4, 3200000.00), (5, 20000000.00),
  (6, 250000.00), (7, 1500000.00), (8, 6000000.00), (9, 4500000.00), (10, 7000000.00);

INSERT INTO `doctor_schedule` (`id`, `doctor_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration`, `max_patient`, `status`) VALUES
  (1, 1, 1, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (2, 1, 3, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (3, 1, 5, '13:30:00', '17:00:00', 30, 7, 'ACTIVE'),
  (4, 2, 2, '08:00:00', '11:30:00', 30, 7, 'ACTIVE'),
  (5, 2, 4, '13:30:00', '17:00:00', 30, 7, 'ACTIVE'),
  (6, 3, 1, '13:30:00', '17:00:00', 20, 10, 'ACTIVE'),
  (7, 3, 4, '08:00:00', '12:00:00', 20, 12, 'ACTIVE'),
  (8, 4, 2, '13:30:00', '17:00:00', 30, 7, 'ACTIVE'),
  (9, 4, 5, '08:00:00', '11:30:00', 30, 7, 'ACTIVE'),
  (10, 5, 3, '13:30:00', '17:00:00', 30, 6, 'ACTIVE'),
  (11, 5, 6, '08:00:00', '11:30:00', 30, 6, 'ACTIVE'),
  (12, 6, 2, '08:00:00', '12:00:00', 30, 8, 'ACTIVE');

INSERT INTO `doctor_leave` (`id`, `doctor_id`, `leave_date`, `reason`) VALUES
  (1, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Nghỉ phép cá nhân'),
  (2, 5, DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'Tham dự hội thảo y khoa'),
  (3, 1, DATE_ADD(CURDATE(), INTERVAL -1 DAY), 'Nghỉ ốm');

INSERT INTO `appointment` (`id`, `patient_id`, `doctor_id`, `admin_id`, `room_id`, `start_at`, `end_at`, `status`, `reason`, `created_at`) VALUES
  (1001, 1, 1, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '08:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '08:30:00'), INTERVAL 7 HOUR), 'DONE', 'Đau đầu, sốt nhẹ 2 ngày', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -8 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1002, 2, 5, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:30:00'), INTERVAL 7 HOUR), 'DONE', 'Đau tức ngực khi gắng sức', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1003, 3, 3, 1, 2, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '13:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '13:50:00'), INTERVAL 7 HOUR), 'DONE', 'Nổi mẩn ngứa toàn thân', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1004, 7, 2, 1, 4, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '09:30:00'), INTERVAL 7 HOUR), 'DONE', 'Sốt cao, ho có đờm', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1005, 4, 4, 1, 3, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '14:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '15:00:00'), INTERVAL 7 HOUR), 'DONE', 'Đau họng, khó nuốt', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1006, 5, 1, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '08:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:00:00'), INTERVAL 7 HOUR), 'DONE', 'Khám sức khỏe định kỳ', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1007, 6, 3, 1, 2, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '13:50:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '14:10:00'), INTERVAL 7 HOUR), 'DONE', 'Mụn trứng cá nặng', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1008, 9, 5, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '14:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '15:00:00'), INTERVAL 7 HOUR), 'CANCELLED', 'Hồi hộp, tim đập nhanh', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1009, 10, 1, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '09:30:00'), INTERVAL 7 HOUR), 'DONE', 'Đau bụng âm ỉ vùng thượng vị', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1010, 8, 2, 1, 4, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '10:30:00'), INTERVAL 7 HOUR), 'CANCELLED', 'Bé quấy khóc, biếng ăn', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1011, 1, 4, 1, 3, DATE_SUB(TIMESTAMP(CURDATE(), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(CURDATE(), '14:30:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Ù tai, nghe kém một bên', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1012, 3, 1, 1, 1, DATE_SUB(TIMESTAMP(CURDATE(), '08:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(CURDATE(), '09:00:00'), INTERVAL 7 HOUR), 'CHECKED_IN', 'Tái khám định kỳ', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1013, 2, 3, NULL, 2, DATE_SUB(TIMESTAMP(CURDATE(), '13:50:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(CURDATE(), '14:10:00'), INTERVAL 7 HOUR), 'PENDING', 'Viêm da tiếp xúc', DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR)),
  (1014, 6, 5, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '08:30:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Kiểm tra huyết áp cao', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1015, 4, 2, 1, 4, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Tiêm phòng định kỳ cho bé', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1016, 10, 6, NULL, 2, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '08:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:00:00'), INTERVAL 7 HOUR), 'PENDING', 'Đau lưng kéo dài', DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR)),
  (1017, 5, 4, NULL, 3, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:30:00'), INTERVAL 7 HOUR), 'PENDING', 'Viêm xoang tái phát', DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR)),
  (1018, 9, 1, NULL, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '08:30:00'), INTERVAL 7 HOUR), 'PENDING', 'Mệt mỏi kéo dài, mất ngủ', DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR)),
  (1019, 7, 3, 1, 2, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '13:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '13:50:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Chàm da cơ địa', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1020, 8, 5, NULL, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '09:00:00'), INTERVAL 7 HOUR), 'PENDING', 'Khám tim mạch tổng quát', DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR));

INSERT INTO `medical_record` (`id`, `appointment_id`, `symptoms`, `diagnosis`, `note`, `follow_up_date`, `created_at`) VALUES
  (501, 1001, 'Đau đầu, sốt nhẹ 2 ngày, hơi chóng mặt', 'Cảm cúm thông thường', 'Nghỉ ngơi, uống nhiều nước, theo dõi nhiệt độ.', DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (502, 1002, 'Đau tức ngực trái khi gắng sức, khó thở nhẹ', 'Thiếu máu cơ tim cục bộ nghi ngờ, cần theo dõi thêm', 'Hạn chế vận động mạnh, tái khám sau 2 tuần kèm điện tâm đồ.', DATE_ADD(CURDATE(), INTERVAL 9 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (503, 1003, 'Nổi mẩn đỏ, ngứa nhiều vùng tay và thân mình', 'Viêm da dị ứng', 'Tránh tiếp xúc xà phòng mạnh, dùng kem dưỡng ẩm.', NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:00:00'), INTERVAL 7 HOUR)),
  (504, 1004, 'Sốt 38.5°C, ho có đờm, chảy mũi', 'Viêm phế quản cấp', 'Theo dõi sốt tại nhà, tái khám nếu sốt trên 3 ngày.', DATE_ADD(CURDATE(), INTERVAL -1 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '10:00:00'), INTERVAL 7 HOUR)),
  (505, 1005, 'Đau rát họng, khó nuốt, ho khan', 'Viêm họng cấp', 'Súc miệng nước muối ấm, hạn chế đồ lạnh.', NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '15:30:00'), INTERVAL 7 HOUR)),
  (506, 1006, 'Không có triệu chứng bất thường', 'Sức khỏe ổn định', 'Duy trì chế độ ăn uống lành mạnh, tái khám định kỳ 6 tháng/lần.', DATE_ADD(CURDATE(), INTERVAL 180 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:30:00'), INTERVAL 7 HOUR)),
  (507, 1007, 'Mụn viêm đỏ, mụn mủ nhiều ở vùng mặt', 'Mụn trứng cá mức độ trung bình - nặng', 'Vệ sinh da đúng cách, tránh nặn mụn, tái khám sau 3 tuần.', DATE_ADD(CURDATE(), INTERVAL 18 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '14:30:00'), INTERVAL 7 HOUR)),
  (508, 1009, 'Đau âm ỉ vùng thượng vị, ợ chua sau ăn', 'Viêm dạ dày cấp', 'Ăn uống điều độ, tránh đồ cay nóng, rượu bia.', DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '10:00:00'), INTERVAL 7 HOUR));

INSERT INTO `prescription` (`id`, `medical_record_id`, `note`) VALUES
  (701, 501, NULL), (702, 502, NULL), (703, 503, NULL), (704, 504, NULL),
  (705, 505, NULL), (707, 507, NULL), (708, 508, NULL);

INSERT INTO `prescription_detail` (`prescription_id`, `medicine_name`, `dosage`, `quantity`, `usage_instruction`) VALUES
  (701, 'Paracetamol 500mg', '1 viên x 3 lần/ngày', 10, 'Uống sau ăn'),
  (701, 'Vitamin C 1000mg', '1 viên/ngày', 7, 'Uống buổi sáng'),
  (702, 'Aspirin 81mg', '1 viên/ngày', 14, 'Uống sau ăn sáng'),
  (702, 'Atorvastatin 20mg', '1 viên/tối', 14, 'Uống trước khi ngủ'),
  (703, 'Cetirizine 10mg', '1 viên/tối', 5, 'Uống sau ăn tối'),
  (703, 'Kem bôi Hydrocortisone 1%', 'Bôi 2 lần/ngày', 1, 'Bôi vùng da tổn thương'),
  (704, 'Amoxicillin 500mg', '1 viên x 3 lần/ngày', 21, 'Uống đủ liều 7 ngày'),
  (704, 'Siro ho Prospan', '10ml x 2 lần/ngày', 1, 'Uống sau ăn'),
  (705, 'Alphachymotrypsin', '2 viên x 2 lần/ngày', 8, 'Ngậm dưới lưỡi'),
  (707, 'Doxycycline 100mg', '1 viên/ngày', 21, 'Uống sau ăn, tránh nắng'),
  (707, 'Gel trị mụn Benzoyl Peroxide', 'Bôi tối trước khi ngủ', 1, 'Tránh vùng mắt'),
  (708, 'Omeprazole 20mg', '1 viên/ngày', 14, 'Uống trước ăn sáng 30 phút'),
  (708, 'Domperidone 10mg', '1 viên x 2 lần/ngày', 14, 'Uống trước ăn');

INSERT INTO `invoice` (`id`, `appointment_id`, `total_amount`, `payment_status`, `payment_method`, `paid_at`, `created_at`) VALUES
  (901, 1001, 285000.00, 'PAID', 'CASH', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '09:30:00'), INTERVAL 7 HOUR)),
  (902, 1002, 570000.00, 'PAID', 'CARD', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '16:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '15:30:00'), INTERVAL 7 HOUR)),
  (903, 1003, 315000.00, 'PAID', 'TRANSFER', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '11:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:30:00'), INTERVAL 7 HOUR)),
  (904, 1004, 360000.00, 'PAID', 'WALLET', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '11:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '10:30:00'), INTERVAL 7 HOUR)),
  (905, 1005, 245000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '16:00:00'), INTERVAL 7 HOUR)),
  (906, 1006, 350000.00, 'PAID', 'CASH', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:45:00'), INTERVAL 7 HOUR)),
  (907, 1007, 430000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (908, 1009, 295000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '10:30:00'), INTERVAL 7 HOUR)),
  (909, 1011, 260000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR));

INSERT INTO `invoice_detail` (`invoice_id`, `label`, `amount`) VALUES
  (901, 'Phí khám Nội tổng quát', 200000.00), (901, 'Thuốc kê đơn', 85000.00),
  (902, 'Phí khám Tim mạch', 300000.00), (902, 'Điện tâm đồ', 150000.00), (902, 'Thuốc kê đơn', 120000.00),
  (903, 'Phí khám Da liễu', 250000.00), (903, 'Thuốc kê đơn', 65000.00),
  (904, 'Phí khám Nhi khoa', 220000.00), (904, 'Thuốc kê đơn', 140000.00),
  (905, 'Phí khám TMH', 200000.00), (905, 'Thuốc kê đơn', 45000.00),
  (906, 'Khám sức khỏe định kỳ', 350000.00),
  (907, 'Phí khám Da liễu', 250000.00), (907, 'Thuốc kê đơn', 180000.00),
  (908, 'Phí khám Nội tổng quát', 200000.00), (908, 'Thuốc kê đơn', 95000.00),
  (909, 'Phí khám Tai Mũi Họng', 200000.00), (909, 'Thuốc kê đơn', 60000.00);

INSERT INTO `notification` (`patient_id`, `appointment_id`, `type`, `text`, `is_read`, `created_at`) VALUES
  (1, 1011, 'CONFIRMED', CONCAT('Lịch hẹn với BS. Nguyễn Đức Minh ngày ', CURDATE(), ' lúc 14:00 đã được xác nhận.'), 0, UTC_TIMESTAMP()),
  (8, 1010, 'CANCELLED', CONCAT('Rất tiếc, lịch hẹn với BS. Lê Văn Cường ngày ', DATE_ADD(CURDATE(), INTERVAL -1 DAY), ' lúc 10:00 đã bị hủy. Vui lòng đặt lại lịch khác.'), 0, UTC_TIMESTAMP()),
  (6, 1014, 'CONFIRMED', CONCAT('Lịch hẹn với BS.CKI Đỗ Thanh Tùng ngày ', DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' lúc 08:00 đã được xác nhận.'), 1, UTC_TIMESTAMP());

ALTER TABLE `users` AUTO_INCREMENT = 300;
ALTER TABLE `specialty` AUTO_INCREMENT = 7;
ALTER TABLE `room` AUTO_INCREMENT = 7;
ALTER TABLE `admin_profile` AUTO_INCREMENT = 2;
ALTER TABLE `doctor` AUTO_INCREMENT = 7;
ALTER TABLE `patient` AUTO_INCREMENT = 11;
ALTER TABLE `doctor_schedule` AUTO_INCREMENT = 13;
ALTER TABLE `doctor_leave` AUTO_INCREMENT = 4;
ALTER TABLE `appointment` AUTO_INCREMENT = 1021;
ALTER TABLE `medical_record` AUTO_INCREMENT = 509;
ALTER TABLE `prescription` AUTO_INCREMENT = 709;
ALTER TABLE `invoice` AUTO_INCREMENT = 910;
ALTER TABLE `notification` AUTO_INCREMENT = 4;

SET FOREIGN_KEY_CHECKS = 1;
