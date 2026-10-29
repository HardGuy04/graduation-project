-- Reseed dữ liệu mẫu tiếng Việt (KHÔNG DROP schema).
-- Dùng được với user clinic_app (chỉ SELECT/INSERT/UPDATE/DELETE).
-- Mật khẩu mọi tài khoản: 123456

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM `wallet_transaction`;
DELETE FROM `notification`;
DELETE FROM `invoice_detail`;
DELETE FROM `invoice`;
DELETE FROM `prescription_detail`;
DELETE FROM `prescription`;
DELETE FROM `medical_record`;
DELETE FROM `appointment`;
DELETE FROM `income`;
DELETE FROM `doctor_leave`;
DELETE FROM `doctor_schedule`;
DELETE FROM `wallet`;
DELETE FROM `patient`;
DELETE FROM `doctor`;
DELETE FROM `admin_profile`;
DELETE FROM `refresh_tokens`;
DELETE FROM `users`;
DELETE FROM `room`;
DELETE FROM `specialty`;

-- Bảng migration (nếu đã tạo)
DELETE FROM `login_attempts`;
DELETE FROM `payment_intent`;

SET @pwd = '$2b$10$l1YHjI5Z2RMP1W8qfoXl5eEVInIQEIIiPcu/67Q1Kb3gA79bo5OZu';

INSERT INTO `specialty` (`id`, `name`, `description`) VALUES
  (1, 'Nội tổng quát', 'Khám và điều trị các bệnh lý nội khoa thông thường.'),
  (2, 'Nhi khoa', 'Chăm sóc sức khỏe trẻ em từ sơ sinh đến 15 tuổi.'),
  (3, 'Da liễu', 'Chẩn đoán và điều trị các bệnh về da, tóc, móng.'),
  (4, 'Tai Mũi Họng', 'Chuyên khoa các bệnh lý tai, mũi, họng.'),
  (5, 'Tim mạch', 'Tầm soát và điều trị các bệnh lý tim mạch.'),
  (6, 'Cơ xương khớp', 'Điều trị các vấn đề về xương khớp, vận động.'),
  (7, 'Thần kinh', 'Đau đầu, chóng mặt, rối loạn thần kinh ngoại biên.'),
  (8, 'Mắt', 'Khám thị lực, tật khúc xạ, viêm kết mạc và bệnh lý mắt thường gặp.'),
  (9, 'Sản phụ khoa', 'Chăm sóc sức khỏe phụ nữ, khám phụ khoa và thai kỳ.'),
  (10, 'Tiêu hóa', 'Bệnh lý dạ dày, ruột, gan mật và rối loạn tiêu hóa.'),
  (11, 'Nội tiết', 'Đái tháo đường, tuyến giáp và rối loạn nội tiết.'),
  (12, 'Răng Hàm Mặt', 'Khám răng miệng, lấy cao răng, điều trị sâu răng.');

INSERT INTO `room` (`id`, `name`, `status`) VALUES
  (1, 'Phòng khám 101', 'AVAILABLE'),
  (2, 'Phòng khám 102', 'AVAILABLE'),
  (3, 'Phòng khám 103', 'AVAILABLE'),
  (4, 'Phòng khám Nhi', 'AVAILABLE'),
  (5, 'Phòng xét nghiệm', 'MAINTENANCE'),
  (6, 'Phòng tiểu phẫu', 'AVAILABLE'),
  (7, 'Phòng khám Mắt', 'AVAILABLE'),
  (8, 'Phòng khám RHM', 'AVAILABLE');

INSERT INTO `users` (`id`, `username`, `email`, `phone`, `password_hash`, `full_name`, `role`, `status`) VALUES
  (1, 'admin@medicare.vn', 'admin@medicare.vn', '0900000000', @pwd, 'Quản trị viên Mai Lan', 'ADMIN', 'ACTIVE'),
  (101, 'tranthib@medicare.vn', 'tranthib@medicare.vn', '0987654321', @pwd, 'BS.CKI Trần Thị Bình', 'DOCTOR', 'ACTIVE'),
  (102, 'levancuong@medicare.vn', 'levancuong@medicare.vn', '0912233445', @pwd, 'BS. Lê Văn Cường', 'DOCTOR', 'ACTIVE'),
  (103, 'phamthuha@medicare.vn', 'phamthuha@medicare.vn', '0977889900', @pwd, 'BS.CKII Phạm Thu Hà', 'DOCTOR', 'ACTIVE'),
  (104, 'nguyenducminh@medicare.vn', 'nguyenducminh@medicare.vn', '0966554433', @pwd, 'BS. Nguyễn Đức Minh', 'DOCTOR', 'ACTIVE'),
  (105, 'dothanhtung@medicare.vn', 'dothanhtung@medicare.vn', '0933221100', @pwd, 'BS.CKI Đỗ Thanh Tùng', 'DOCTOR', 'ACTIVE'),
  (106, 'vungoclan@medicare.vn', 'vungoclan@medicare.vn', '0944556677', @pwd, 'BS. Vũ Ngọc Lan', 'DOCTOR', 'LOCKED'),
  (107, 'nguyenhuonggiang@medicare.vn', 'nguyenhuonggiang@medicare.vn', '0901112233', @pwd, 'BS.CKI Nguyễn Hương Giang', 'DOCTOR', 'ACTIVE'),
  (108, 'tranvanhoa@medicare.vn', 'tranvanhoa@medicare.vn', '0902223344', @pwd, 'BS. Trần Văn Hòa', 'DOCTOR', 'ACTIVE'),
  (109, 'lethikimngan@medicare.vn', 'lethikimngan@medicare.vn', '0903334455', @pwd, 'BS.CKII Lê Thị Kim Ngân', 'DOCTOR', 'ACTIVE'),
  (110, 'phamquocviet@medicare.vn', 'phamquocviet@medicare.vn', '0904445566', @pwd, 'BS. Phạm Quốc Việt', 'DOCTOR', 'ACTIVE'),
  (111, 'hoangthanhson@medicare.vn', 'hoangthanhson@medicare.vn', '0905556677', @pwd, 'BS.CKI Hoàng Thanh Sơn', 'DOCTOR', 'ACTIVE'),
  (112, 'dangthuyvan@medicare.vn', 'dangthuyvan@medicare.vn', '0906667788', @pwd, 'BS. Đặng Thùy Vân', 'DOCTOR', 'ACTIVE'),
  (113, 'buiminhduc@medicare.vn', 'buiminhduc@medicare.vn', '0907778899', @pwd, 'BS. Bùi Minh Đức', 'DOCTOR', 'ACTIVE'),
  (114, 'ngothanhtruc@medicare.vn', 'ngothanhtruc@medicare.vn', '0908889900', @pwd, 'ThS.BS Ngô Thanh Trúc', 'DOCTOR', 'ACTIVE'),
  (201, 'nguyenvanan@gmail.com', 'nguyenvanan@gmail.com', '0912345678', @pwd, 'Nguyễn Văn An', 'PATIENT', 'ACTIVE'),
  (202, 'tranthibich@gmail.com', 'tranthibich@gmail.com', '0923456789', @pwd, 'Trần Thị Bích', 'PATIENT', 'ACTIVE'),
  (203, 'lehoangnam@gmail.com', 'lehoangnam@gmail.com', '0934567890', @pwd, 'Lê Hoàng Nam', 'PATIENT', 'ACTIVE'),
  (204, 'phamthiduyen@gmail.com', 'phamthiduyen@gmail.com', '0945678901', @pwd, 'Phạm Thị Duyên', 'PATIENT', 'ACTIVE'),
  (205, 'hoangminhduc@gmail.com', 'hoangminhduc@gmail.com', '0956789012', @pwd, 'Hoàng Minh Đức', 'PATIENT', 'ACTIVE'),
  (206, 'dangthutrang@gmail.com', 'dangthutrang@gmail.com', '0967890123', @pwd, 'Đặng Thu Trang', 'PATIENT', 'ACTIVE'),
  (207, 'buianhtuan@gmail.com', 'buianhtuan@gmail.com', '0978901234', @pwd, 'Bùi Anh Tuấn', 'PATIENT', 'ACTIVE'),
  (208, 'vuthimai@gmail.com', 'vuthimai@gmail.com', '0989012345', @pwd, 'Vũ Thị Mai', 'PATIENT', 'LOCKED'),
  (209, 'ngoquocbao@gmail.com', 'ngoquocbao@gmail.com', '0990123456', @pwd, 'Ngô Quốc Bảo', 'PATIENT', 'ACTIVE'),
  (210, 'dinhkhanhlinh@gmail.com', 'dinhkhanhlinh@gmail.com', '0901234567', @pwd, 'Đinh Khánh Linh', 'PATIENT', 'ACTIVE'),
  (211, 'phamthanhha@gmail.com', 'phamthanhha@gmail.com', '0911223344', @pwd, 'Phạm Thanh Hà', 'PATIENT', 'ACTIVE'),
  (212, 'tranquanghuy@gmail.com', 'tranquanghuy@gmail.com', '0922334455', @pwd, 'Trần Quang Huy', 'PATIENT', 'ACTIVE'),
  (213, 'nguyenthimaianh@gmail.com', 'nguyenthimaianh@gmail.com', '0933445566', @pwd, 'Nguyễn Thị Mai Anh', 'PATIENT', 'ACTIVE'),
  (214, 'leminhtuan@gmail.com', 'leminhtuan@gmail.com', '0911002200', @pwd, 'Lê Minh Tuấn', 'PATIENT', 'ACTIVE'),
  (215, 'hoangthuyduong@gmail.com', 'hoangthuyduong@gmail.com', '0955667788', @pwd, 'Hoàng Thùy Dương', 'PATIENT', 'ACTIVE');

INSERT INTO `admin_profile` (`id`, `user_id`, `position`) VALUES
  (1, 1, 'Lễ tân / Quản trị');

INSERT INTO `doctor` (`id`, `user_id`, `specialty_id`, `experience`, `degree`) VALUES
  (1, 101, 1, 8, 'Chuyên khoa I'),
  (2, 102, 2, 6, 'Thạc sĩ'),
  (3, 103, 3, 12, 'Chuyên khoa II'),
  (4, 104, 4, 4, 'Bác sĩ'),
  (5, 105, 5, 10, 'Chuyên khoa I'),
  (6, 106, 6, 5, 'Thạc sĩ'),
  (7, 107, 7, 9, 'Chuyên khoa I'),
  (8, 108, 8, 7, 'Bác sĩ'),
  (9, 109, 9, 14, 'Chuyên khoa II'),
  (10, 110, 10, 8, 'Thạc sĩ'),
  (11, 111, 11, 11, 'Chuyên khoa I'),
  (12, 112, 12, 6, 'Bác sĩ'),
  (13, 113, 1, 5, 'Bác sĩ'),
  (14, 114, 5, 13, 'Thạc sĩ');

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
  (10, 210, '1996-06-14', 'FEMALE', 'Cầu Giấy, Hà Nội'),
  (11, 211, '1992-04-21', 'FEMALE', 'Hoàn Kiếm, Hà Nội'),
  (12, 212, '1987-09-08', 'MALE', 'Hà Đông, Hà Nội'),
  (13, 213, '2000-12-01', 'FEMALE', 'Gia Lâm, Hà Nội'),
  (14, 214, '1994-03-17', 'MALE', 'Thanh Trì, Hà Nội'),
  (15, 215, '1991-07-29', 'FEMALE', 'Bắc Từ Liêm, Hà Nội');

INSERT INTO `wallet` (`patient_id`, `balance`) VALUES
  (1, 5000000.00), (2, 12000000.00), (3, 800000.00), (4, 3200000.00), (5, 20000000.00),
  (6, 250000.00), (7, 1500000.00), (8, 6000000.00), (9, 4500000.00), (10, 7000000.00),
  (11, 2800000.00), (12, 9100000.00), (13, 1500000.00), (14, 4300000.00), (15, 6700000.00);

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
  (12, 6, 2, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (13, 1, 2, '13:30:00', '17:00:00', 30, 8, 'ACTIVE'),
  (14, 2, 6, '08:00:00', '11:00:00', 30, 6, 'ACTIVE'),
  (15, 4, 3, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (16, 7, 1, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (17, 7, 4, '13:30:00', '17:00:00', 30, 8, 'ACTIVE'),
  (18, 8, 2, '08:00:00', '12:00:00', 20, 10, 'ACTIVE'),
  (19, 8, 5, '13:30:00', '16:30:00', 20, 9, 'ACTIVE'),
  (20, 9, 3, '08:00:00', '11:30:00', 30, 6, 'ACTIVE'),
  (21, 9, 6, '08:00:00', '11:00:00', 30, 6, 'ACTIVE'),
  (22, 10, 1, '13:30:00', '17:00:00', 30, 8, 'ACTIVE'),
  (23, 10, 3, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (24, 11, 2, '08:00:00', '12:00:00', 30, 7, 'ACTIVE'),
  (25, 11, 5, '08:00:00', '11:30:00', 30, 7, 'ACTIVE'),
  (26, 12, 4, '08:00:00', '12:00:00', 20, 12, 'ACTIVE'),
  (27, 12, 6, '13:30:00', '17:00:00', 20, 10, 'ACTIVE'),
  (28, 13, 4, '08:00:00', '12:00:00', 30, 8, 'ACTIVE'),
  (29, 14, 1, '08:00:00', '11:30:00', 30, 6, 'ACTIVE'),
  (30, 14, 5, '13:30:00', '17:00:00', 30, 6, 'ACTIVE');

INSERT INTO `doctor_leave` (`id`, `doctor_id`, `leave_date`, `reason`) VALUES
  (1, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Nghỉ phép cá nhân'),
  (2, 5, DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'Tham dự hội thảo y khoa'),
  (3, 1, DATE_ADD(CURDATE(), INTERVAL -1 DAY), 'Nghỉ ốm'),
  (4, 2, DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'Họp chuyên môn bệnh viện');

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
  (1020, 8, 5, NULL, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '08:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '09:00:00'), INTERVAL 7 HOUR), 'PENDING', 'Khám tim mạch tổng quát', DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR)),
  (1021, 11, 1, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '09:30:00'), INTERVAL 7 HOUR), 'DONE', 'Ho kéo dài hơn 1 tuần', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -9 DAY), '10:00:00'), INTERVAL 7 HOUR)),
  (1022, 12, 4, 1, 3, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '14:30:00'), INTERVAL 7 HOUR), 'DONE', 'Nghẹt mũi, chảy nước mũi', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -8 DAY), '11:00:00'), INTERVAL 7 HOUR)),
  (1023, 13, 3, 1, 2, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '14:20:00'), INTERVAL 7 HOUR), 'DONE', 'Nám da mặt', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (1024, 14, 5, 1, 1, DATE_SUB(TIMESTAMP(CURDATE(), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(CURDATE(), '09:30:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Đo huyết áp, chóng mặt', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (1025, 15, 2, NULL, 4, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '10:30:00'), INTERVAL 7 HOUR), 'PENDING', 'Khám sức khỏe trẻ em định kỳ', DATE_SUB(TIMESTAMP(CURDATE(), '09:00:00'), INTERVAL 7 HOUR)),
  (1026, 11, 5, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 6 DAY), '09:30:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Tái khám tim mạch', DATE_SUB(TIMESTAMP(CURDATE(), '10:00:00'), INTERVAL 7 HOUR)),
  (1027, 12, 1, NULL, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -10 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -10 DAY), '10:30:00'), INTERVAL 7 HOUR), 'NO_SHOW', 'Đau dạ dày', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -12 DAY), '08:00:00'), INTERVAL 7 HOUR)),
  (1028, 13, 7, 1, 1, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:30:00'), INTERVAL 7 HOUR), 'DONE', 'Đau đầu nửa bên, chóng mặt', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '10:00:00'), INTERVAL 7 HOUR)),
  (1029, 11, 8, 1, 7, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:20:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Mỏi mắt, nhìn mờ khi làm việc máy tính', DATE_SUB(TIMESTAMP(CURDATE(), '11:00:00'), INTERVAL 7 HOUR)),
  (1030, 15, 9, 1, 3, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '09:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Khám phụ khoa định kỳ', DATE_SUB(TIMESTAMP(CURDATE(), '14:00:00'), INTERVAL 7 HOUR)),
  (1031, 5, 10, NULL, 2, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:30:00'), INTERVAL 7 HOUR), 'PENDING', 'Đau thượng vị, đầy hơi sau ăn', DATE_SUB(TIMESTAMP(CURDATE(), '09:30:00'), INTERVAL 7 HOUR)),
  (1032, 2, 11, 1, 3, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '09:30:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 5 DAY), '10:00:00'), INTERVAL 7 HOUR), 'CONFIRMED', 'Theo dõi đường huyết', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '16:00:00'), INTERVAL 7 HOUR)),
  (1033, 9, 12, NULL, 8, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:20:00'), INTERVAL 7 HOUR), 'PENDING', 'Ê buốt răng hàm dưới', DATE_SUB(TIMESTAMP(CURDATE(), '10:30:00'), INTERVAL 7 HOUR)),
  (1034, 14, 14, 1, 7, DATE_SUB(TIMESTAMP(CURDATE(), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(CURDATE(), '10:30:00'), INTERVAL 7 HOUR), 'PENDING', 'Khám tim mạch tầm soát', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '08:00:00'), INTERVAL 7 HOUR));

INSERT INTO `medical_record` (`id`, `appointment_id`, `symptoms`, `diagnosis`, `note`, `follow_up_date`, `created_at`) VALUES
  (501, 1001, 'Đau đầu, sốt nhẹ 2 ngày, hơi chóng mặt', 'Cảm cúm thông thường', 'Nghỉ ngơi, uống nhiều nước, theo dõi nhiệt độ.', DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '09:00:00'), INTERVAL 7 HOUR)),
  (502, 1002, 'Đau tức ngực trái khi gắng sức, khó thở nhẹ', 'Thiếu máu cơ tim cục bộ nghi ngờ, cần theo dõi thêm', 'Hạn chế vận động mạnh, tái khám sau 2 tuần kèm điện tâm đồ.', DATE_ADD(CURDATE(), INTERVAL 9 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (503, 1003, 'Nổi mẩn đỏ, ngứa nhiều vùng tay và thân mình', 'Viêm da dị ứng', 'Tránh tiếp xúc xà phòng mạnh, dùng kem dưỡng ẩm.', NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:00:00'), INTERVAL 7 HOUR)),
  (504, 1004, 'Sốt 38.5°C, ho có đờm, chảy mũi', 'Viêm phế quản cấp', 'Theo dõi sốt tại nhà, tái khám nếu sốt trên 3 ngày.', DATE_ADD(CURDATE(), INTERVAL -1 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '10:00:00'), INTERVAL 7 HOUR)),
  (505, 1005, 'Đau rát họng, khó nuốt, ho khan', 'Viêm họng cấp', 'Súc miệng nước muối ấm, hạn chế đồ lạnh.', NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '15:30:00'), INTERVAL 7 HOUR)),
  (506, 1006, 'Không có triệu chứng bất thường', 'Sức khỏe ổn định', 'Duy trì chế độ ăn uống lành mạnh, tái khám định kỳ 6 tháng/lần.', DATE_ADD(CURDATE(), INTERVAL 180 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:30:00'), INTERVAL 7 HOUR)),
  (507, 1007, 'Mụn viêm đỏ, mụn mủ nhiều ở vùng mặt', 'Mụn trứng cá mức độ trung bình - nặng', 'Vệ sinh da đúng cách, tránh nặn mụn, tái khám sau 3 tuần.', DATE_ADD(CURDATE(), INTERVAL 18 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '14:30:00'), INTERVAL 7 HOUR)),
  (508, 1009, 'Đau âm ỉ vùng thượng vị, ợ chua sau ăn', 'Viêm dạ dày cấp', 'Ăn uống điều độ, tránh đồ cay nóng, rượu bia.', DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '10:00:00'), INTERVAL 7 HOUR)),
  (509, 1021, 'Ho khan về đêm, mệt nhẹ', 'Viêm họng dị ứng', 'Tránh khói bụi, uống nhiều nước ấm.', DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '10:00:00'), INTERVAL 7 HOUR)),
  (510, 1022, 'Nghẹt mũi hai bên, đau vùng xoang', 'Viêm mũi xoang cấp', 'Xịt mũi nước muối sinh lý, tái khám nếu sốt.', NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (511, 1023, 'Nám má, da khô', 'Nám da do ánh nắng', 'Bôi kem chống nắng SPF50, hạn chế ra nắng gắt.', DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (512, 1028, 'Đau nửa đầu bên phải, buồn nôn nhẹ', 'Đau đầu Migraine', 'Nghỉ ngơi nơi tối yên tĩnh, hạn chế caffeine.', DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '10:00:00'), INTERVAL 7 HOUR));

INSERT INTO `prescription` (`id`, `medical_record_id`, `note`) VALUES
  (701, 501, NULL), (702, 502, NULL), (703, 503, NULL), (704, 504, NULL),
  (705, 505, NULL), (707, 507, NULL), (708, 508, NULL),
  (709, 509, NULL), (710, 510, NULL), (711, 511, 'Tái khám sau 1 tháng'),
  (712, 512, NULL);

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
  (708, 'Domperidone 10mg', '1 viên x 2 lần/ngày', 14, 'Uống trước ăn'),
  (709, 'Loratadine 10mg', '1 viên/ngày', 7, 'Uống buổi tối'),
  (710, 'Xịt mũi Otrivin', '2 nhát x 2 lần/ngày', 1, 'Không dùng quá 5 ngày'),
  (710, 'Amoxicillin 500mg', '1 viên x 2 lần/ngày', 14, 'Uống sau ăn'),
  (711, 'Kem chống nắng SPF50', 'Bôi buổi sáng', 1, 'Bôi lại sau 2–3 giờ nếu ra ngoài'),
  (712, 'Paracetamol 500mg', '1 viên khi đau', 10, 'Không quá 3 viên/ngày'),
  (712, 'Domperidone 10mg', '1 viên khi buồn nôn', 10, 'Uống trước ăn');

INSERT INTO `invoice` (`id`, `appointment_id`, `total_amount`, `payment_status`, `payment_method`, `paid_at`, `created_at`) VALUES
  (901, 1001, 285000.00, 'PAID', 'CASH', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '09:30:00'), INTERVAL 7 HOUR)),
  (902, 1002, 570000.00, 'PAID', 'CARD', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '16:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '15:30:00'), INTERVAL 7 HOUR)),
  (903, 1003, 315000.00, 'PAID', 'TRANSFER', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '11:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:30:00'), INTERVAL 7 HOUR)),
  (904, 1004, 360000.00, 'PAID', 'WALLET', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '11:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '10:30:00'), INTERVAL 7 HOUR)),
  (905, 1005, 245000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '16:00:00'), INTERVAL 7 HOUR)),
  (906, 1006, 350000.00, 'PAID', 'CASH', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '10:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '09:45:00'), INTERVAL 7 HOUR)),
  (907, 1007, 430000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -3 DAY), '15:00:00'), INTERVAL 7 HOUR)),
  (908, 1009, 295000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -2 DAY), '10:30:00'), INTERVAL 7 HOUR)),
  (909, 1011, 260000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(CURDATE(), '08:00:00'), INTERVAL 7 HOUR)),
  (910, 1021, 270000.00, 'PAID', 'CASH', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '11:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '10:30:00'), INTERVAL 7 HOUR)),
  (911, 1022, 290000.00, 'PAID', 'TRANSFER', DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -6 DAY), '16:00:00'), INTERVAL 7 HOUR), DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -7 DAY), '15:30:00'), INTERVAL 7 HOUR)),
  (912, 1023, 380000.00, 'UNPAID', NULL, NULL, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -1 DAY), '16:00:00'), INTERVAL 7 HOUR));

INSERT INTO `invoice_detail` (`invoice_id`, `label`, `amount`) VALUES
  (901, 'Phí khám Nội tổng quát', 200000.00), (901, 'Thuốc kê đơn', 85000.00),
  (902, 'Phí khám Tim mạch', 300000.00), (902, 'Điện tâm đồ', 150000.00), (902, 'Thuốc kê đơn', 120000.00),
  (903, 'Phí khám Da liễu', 250000.00), (903, 'Thuốc kê đơn', 65000.00),
  (904, 'Phí khám Nhi khoa', 220000.00), (904, 'Thuốc kê đơn', 140000.00),
  (905, 'Phí khám TMH', 200000.00), (905, 'Thuốc kê đơn', 45000.00),
  (906, 'Khám sức khỏe định kỳ', 350000.00),
  (907, 'Phí khám Da liễu', 250000.00), (907, 'Thuốc kê đơn', 180000.00),
  (908, 'Phí khám Nội tổng quát', 200000.00), (908, 'Thuốc kê đơn', 95000.00),
  (909, 'Phí khám Tai Mũi Họng', 200000.00), (909, 'Thuốc kê đơn', 60000.00),
  (910, 'Phí khám Nội tổng quát', 200000.00), (910, 'Thuốc kê đơn', 70000.00),
  (911, 'Phí khám Tai Mũi Họng', 200000.00), (911, 'Thuốc kê đơn', 90000.00),
  (912, 'Phí khám Da liễu', 250000.00), (912, 'Thuốc / mỹ phẩm điều trị', 130000.00);

INSERT INTO `wallet_transaction` (`wallet_id`, `invoice_id`, `type`, `amount`, `balance_after`, `created_at`)
SELECT w.id, 904, 'PAYMENT', 360000.00, w.balance, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -4 DAY), '11:00:00'), INTERVAL 7 HOUR)
  FROM `wallet` w WHERE w.patient_id = 7;

INSERT INTO `wallet_transaction` (`wallet_id`, `invoice_id`, `type`, `amount`, `balance_after`, `created_at`)
SELECT w.id, NULL, 'TOPUP', 2000000.00, w.balance, DATE_SUB(TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL -10 DAY), '12:00:00'), INTERVAL 7 HOUR)
  FROM `wallet` w WHERE w.patient_id = 1;

INSERT INTO `notification` (`patient_id`, `appointment_id`, `type`, `text`, `is_read`, `created_at`) VALUES
  (1, 1011, 'CONFIRMED', CONCAT('Lịch hẹn với BS. Nguyễn Đức Minh ngày ', CURDATE(), ' lúc 14:00 đã được xác nhận.'), 0, UTC_TIMESTAMP()),
  (8, 1010, 'CANCELLED', CONCAT('Rất tiếc, lịch hẹn với BS. Lê Văn Cường ngày ', DATE_ADD(CURDATE(), INTERVAL -1 DAY), ' lúc 10:00 đã bị hủy. Vui lòng đặt lại lịch khác.'), 0, UTC_TIMESTAMP()),
  (6, 1014, 'CONFIRMED', CONCAT('Lịch hẹn với BS.CKI Đỗ Thanh Tùng ngày ', DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' lúc 08:00 đã được xác nhận.'), 1, UTC_TIMESTAMP()),
  (14, 1024, 'CONFIRMED', CONCAT('Lịch hẹn với BS.CKI Đỗ Thanh Tùng ngày ', CURDATE(), ' lúc 09:00 đã được xác nhận.'), 0, UTC_TIMESTAMP()),
  (15, 1025, 'CREATED', CONCAT('Bạn đã đặt lịch với BS. Lê Văn Cường ngày ', DATE_ADD(CURDATE(), INTERVAL 3 DAY), ' lúc 10:00. Chờ xác nhận.'), 0, UTC_TIMESTAMP()),
  (11, 1026, 'CONFIRMED', CONCAT('Lịch hẹn tái khám tim mạch ngày ', DATE_ADD(CURDATE(), INTERVAL 6 DAY), ' lúc 09:00 đã được xác nhận.'), 0, UTC_TIMESTAMP()),
  (12, 1027, 'NO_SHOW', 'Bạn đã vắng mặt ở lịch khám Nội tổng quát. Vui lòng đặt lại lịch nếu còn nhu cầu.', 0, UTC_TIMESTAMP()),
  (4, 1015, 'REMINDER_24H', CONCAT('Nhắc lịch: ngày ', DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' lúc 09:30 với BS. Lê Văn Cường.'), 0, UTC_TIMESTAMP());

INSERT INTO `income` (`doctor_id`, `period_month`, `salary`, `day_on`, `day_off`, `received`) VALUES
  (1, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 22000000.00, 22, 4, 18615384.62),
  (2, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 19000000.00, 20, 6, 14615384.62),
  (3, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 26000000.00, 21, 5, 21000000.00),
  (4, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 16000000.00, 22, 4, 13538461.54),
  (5, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 24000000.00, 18, 8, 16615384.62),
  (7, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 21000000.00, 20, 6, 16153846.15),
  (8, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 18000000.00, 21, 5, 14538461.54),
  (9, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 25000000.00, 19, 7, 18269230.77),
  (10, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 20000000.00, 22, 4, 16923076.92),
  (11, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 23000000.00, 20, 6, 17692307.69),
  (12, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 17000000.00, 22, 4, 14384615.38),
  (13, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 15000000.00, 21, 5, 12115384.62),
  (14, DATE_FORMAT(CURDATE(), '%Y-%m-01'), 24500000.00, 20, 6, 18846153.85);

SET FOREIGN_KEY_CHECKS = 1;

SELECT 'users' AS t, COUNT(*) AS n FROM users
UNION ALL SELECT 'specialty', COUNT(*) FROM specialty
UNION ALL SELECT 'doctor', COUNT(*) FROM doctor
UNION ALL SELECT 'patient', COUNT(*) FROM patient
UNION ALL SELECT 'appointment', COUNT(*) FROM appointment
UNION ALL SELECT 'invoice', COUNT(*) FROM invoice
UNION ALL SELECT 'medical_record', COUNT(*) FROM medical_record
UNION ALL SELECT 'notification', COUNT(*) FROM notification;
