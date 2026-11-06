-- ═══════════════════════════════════════════════════════════════════════════
-- MediCare Hub — Seed Data SQL
-- Dữ liệu mẫu chuyển từ frontend/src/mock/seedData.js
-- Mật khẩu mặc định: 123456 (bcrypt hash)
-- ═══════════════════════════════════════════════════════════════════════════

USE `clinic`;

-- Password hash cho "123456" (bcrypt, 10 rounds)
SET @pwd = '$2a$10$YQ8Gq1Q3K6sF0bE5x4z7VuZlU8kR9pO2nI7mH6jG5fD4cB3aA2zYi';

-- ─────────────── SPECIALTIES ────────────────────────────────────────────────
INSERT INTO `specialty` (`id`, `name`, `description`, `icon`) VALUES
  (1, 'Nội tổng quát',   'Khám và điều trị các bệnh lý nội khoa thông thường.', 'stethoscope'),
  (2, 'Nhi khoa',        'Chăm sóc sức khỏe trẻ em từ sơ sinh đến 15 tuổi.',    'baby'),
  (3, 'Da liễu',         'Chẩn đoán và điều trị các bệnh về da, tóc, móng.',     'sparkles'),
  (4, 'Tai Mũi Họng',    'Chuyên khoa các bệnh lý tai, mũi, họng.',             'ear'),
  (5, 'Tim mạch',        'Tầm soát và điều trị các bệnh lý tim mạch.',          'heart'),
  (6, 'Cơ xương khớp',   'Điều trị các vấn đề về xương khớp, vận động.',        'bone')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ─────────────── ROOMS ──────────────────────────────────────────────────────
INSERT INTO `room` (`id`, `name`, `floor`, `status`) VALUES
  (1, 'Phòng khám 101',   'Tầng 1', 'in_use'),
  (2, 'Phòng khám 102',   'Tầng 1', 'available'),
  (3, 'Phòng khám 103',   'Tầng 1', 'available'),
  (4, 'Phòng khám Nhi',   'Tầng 2', 'in_use'),
  (5, 'Phòng xét nghiệm', 'Tầng 2', 'maintenance'),
  (6, 'Phòng tiểu phẫu',  'Tầng 3', 'available')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ─────────────── USERS (admin + doctors + patients) ─────────────────────────
-- Admin
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `role`, `status`) VALUES
  (1, 'admin@medicare.vn', @pwd, 'Quản trị viên Mai Lan', '0900000000', 'admin', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

INSERT INTO `admin_profile` (`user_id`) VALUES (1)
ON DUPLICATE KEY UPDATE `user_id` = VALUES(`user_id`);

-- Doctors (users)
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `role`, `status`) VALUES
  (101, 'tranthib@medicare.vn',       @pwd, 'BS.CKI Trần Thị Bình',  '0987654321', 'doctor', 'active'),
  (102, 'levancuong@medicare.vn',     @pwd, 'BS. Lê Văn Cường',      '0912233445', 'doctor', 'active'),
  (103, 'phamthuha@medicare.vn',      @pwd, 'BS.CKII Phạm Thu Hà',   '0977889900', 'doctor', 'active'),
  (104, 'nguyenducminh@medicare.vn',  @pwd, 'BS. Nguyễn Đức Minh',   '0966554433', 'doctor', 'active'),
  (105, 'dothanhtung@medicare.vn',    @pwd, 'BS.CKI Đỗ Thanh Tùng',  '0933221100', 'doctor', 'active'),
  (106, 'vungoclan@medicare.vn',      @pwd, 'BS. Vũ Ngọc Lan',       '0944556677', 'doctor', 'locked')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Doctors (profile)
INSERT INTO `doctor` (`id`, `user_id`, `specialty_id`, `degree`, `experience_years`, `description`, `avatar_color`, `base_salary`) VALUES
  (1, 101, 1, 'Chuyên khoa I',  8,  '8 năm kinh nghiệm nội tổng quát, tốt nghiệp Đại học Y Hà Nội.',  '#0F5C56', 22000000),
  (2, 102, 2, 'Thạc sĩ',        6,  'Chuyên nhi khoa, giàu kinh nghiệm khám trẻ sơ sinh.',             '#C08D2E', 19000000),
  (3, 103, 3, 'Chuyên khoa II', 12, '12 năm kinh nghiệm điều trị da liễu thẩm mỹ.',                   '#9C7124', 26000000),
  (4, 104, 4, 'Bác sĩ',         4,  'Chuyên khám và điều trị các bệnh lý tai mũi họng.',               '#3F9683', 16000000),
  (5, 105, 5, 'Chuyên khoa I',  10, '10 năm kinh nghiệm tim mạch, từng công tác tại BV Bạch Mai.',     '#227354', 24000000),
  (6, 106, 6, 'Thạc sĩ',        5,  'Chuyên điều trị các bệnh lý cơ xương khớp, vật lý trị liệu.',    '#A23931', 17000000)
ON DUPLICATE KEY UPDATE `degree` = VALUES(`degree`);

-- Patients (users)
INSERT INTO `users` (`id`, `email`, `password`, `full_name`, `phone`, `role`, `status`) VALUES
  (201, 'nguyenvanan@gmail.com',   @pwd, 'Nguyễn Văn An',    '0912345678', 'patient', 'active'),
  (202, 'tranthibich@gmail.com',   @pwd, 'Trần Thị Bích',    '0923456789', 'patient', 'active'),
  (203, 'lehoangnam@gmail.com',    @pwd, 'Lê Hoàng Nam',     '0934567890', 'patient', 'active'),
  (204, 'phamthiduyen@gmail.com',  @pwd, 'Phạm Thị Duyên',   '0945678901', 'patient', 'active'),
  (205, 'hoangminhduc@gmail.com',  @pwd, 'Hoàng Minh Đức',   '0956789012', 'patient', 'active'),
  (206, 'dangthutrang@gmail.com',  @pwd, 'Đặng Thu Trang',   '0967890123', 'patient', 'active'),
  (207, 'buianhtuan@gmail.com',    @pwd, 'Bùi Anh Tuấn',     '0978901234', 'patient', 'active'),
  (208, 'vuthimai@gmail.com',      @pwd, 'Vũ Thị Mai',       '0989012345', 'patient', 'locked'),
  (209, 'ngoquocbao@gmail.com',    @pwd, 'Ngô Quốc Bảo',     '0990123456', 'patient', 'active'),
  (210, 'dinhkhanhlinh@gmail.com', @pwd, 'Đinh Khánh Linh',  '0901234567', 'patient', 'active')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- Patients (profile)
INSERT INTO `patient` (`id`, `user_id`, `date_of_birth`, `gender`, `address`) VALUES
  (1, 201, '1990-05-15', 'male',   'Cầu Giấy, Hà Nội'),
  (2, 202, '1985-11-02', 'female', 'Đống Đa, Hà Nội'),
  (3, 203, '2001-02-20', 'male',   'Hai Bà Trưng, Hà Nội'),
  (4, 204, '1998-08-09', 'female', 'Thanh Xuân, Hà Nội'),
  (5, 205, '1975-03-30', 'male',   'Ba Đình, Hà Nội'),
  (6, 206, '1993-12-12', 'female', 'Long Biên, Hà Nội'),
  (7, 207, '2015-07-18', 'male',   'Nam Từ Liêm, Hà Nội'),
  (8, 208, '1988-09-25', 'female', 'Hoàng Mai, Hà Nội'),
  (9, 209, '1999-01-05', 'male',   'Tây Hồ, Hà Nội'),
  (10, 210, '1996-06-14', 'female', 'Cầu Giấy, Hà Nội')
ON DUPLICATE KEY UPDATE `address` = VALUES(`address`);

-- ─────────────── WALLETS ────────────────────────────────────────────────────
INSERT INTO `wallet` (`patient_id`, `balance`) VALUES
  (1,  5000000),
  (2,  12000000),
  (3,  800000),
  (4,  3200000),
  (5,  20000000),
  (6,  250000),
  (7,  1500000),
  (8,  6000000),
  (9,  4500000),
  (10, 7000000)
ON DUPLICATE KEY UPDATE `balance` = VALUES(`balance`);

-- ─────────────── DOCTOR SCHEDULES ───────────────────────────────────────────
INSERT INTO `doctor_schedule` (`id`, `doctor_id`, `day_of_week`, `start_time`, `end_time`, `slot_duration`, `max_patients`, `room`) VALUES
  (1,  1, 1, '08:00', '12:00', 30, 8,  'Phòng khám 101'),
  (2,  1, 3, '08:00', '12:00', 30, 8,  'Phòng khám 101'),
  (3,  1, 5, '13:30', '17:00', 30, 7,  'Phòng khám 101'),
  (4,  2, 2, '08:00', '11:30', 30, 7,  'Phòng khám Nhi'),
  (5,  2, 4, '13:30', '17:00', 30, 7,  'Phòng khám Nhi'),
  (6,  3, 1, '13:30', '17:00', 20, 10, 'Phòng khám 102'),
  (7,  3, 4, '08:00', '12:00', 20, 12, 'Phòng khám 102'),
  (8,  4, 2, '13:30', '17:00', 30, 7,  'Phòng khám 103'),
  (9,  4, 5, '08:00', '11:30', 30, 7,  'Phòng khám 103'),
  (10, 5, 3, '13:30', '17:00', 30, 6,  'Phòng khám 101'),
  (11, 5, 6, '08:00', '11:30', 30, 6,  'Phòng khám 101'),
  (12, 6, 2, '08:00', '12:00', 30, 8,  'Phòng khám 102')
ON DUPLICATE KEY UPDATE `room` = VALUES(`room`);

-- ─────────────── DOCTOR LEAVES ──────────────────────────────────────────────
INSERT INTO `doctor_leave` (`id`, `doctor_id`, `date`, `reason`) VALUES
  (1, 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  'Nghỉ phép cá nhân'),
  (2, 5, DATE_ADD(CURDATE(), INTERVAL 6 DAY),  'Tham dự hội thảo y khoa'),
  (3, 1, DATE_ADD(CURDATE(), INTERVAL -1 DAY), 'Nghỉ ốm')
ON DUPLICATE KEY UPDATE `reason` = VALUES(`reason`);

-- ─────────────── APPOINTMENTS ───────────────────────────────────────────────
INSERT INTO `appointment` (`id`, `patient_id`, `doctor_id`, `date`, `start_time`, `end_time`, `reason`, `status`, `created_at`) VALUES
  (1001, 1, 1, DATE_ADD(CURDATE(), INTERVAL -6 DAY), '08:00', '08:30', 'Đau đầu, sốt nhẹ 2 ngày',       'completed',   DATE_ADD(CURDATE(), INTERVAL -8 DAY)),
  (1002, 2, 5, DATE_ADD(CURDATE(), INTERVAL -5 DAY), '14:00', '14:30', 'Đau tức ngực khi gắng sức',      'completed',   DATE_ADD(CURDATE(), INTERVAL -7 DAY)),
  (1003, 3, 3, DATE_ADD(CURDATE(), INTERVAL -5 DAY), '13:30', '13:50', 'Nổi mẩn ngứa toàn thân',         'completed',   DATE_ADD(CURDATE(), INTERVAL -6 DAY)),
  (1004, 7, 2, DATE_ADD(CURDATE(), INTERVAL -4 DAY), '09:00', '09:30', 'Sốt cao, ho có đờm',              'completed',   DATE_ADD(CURDATE(), INTERVAL -5 DAY)),
  (1005, 4, 4, DATE_ADD(CURDATE(), INTERVAL -4 DAY), '14:30', '15:00', 'Đau họng, khó nuốt',              'completed',   DATE_ADD(CURDATE(), INTERVAL -6 DAY)),
  (1006, 5, 1, DATE_ADD(CURDATE(), INTERVAL -3 DAY), '08:30', '09:00', 'Khám sức khỏe định kỳ',           'completed',   DATE_ADD(CURDATE(), INTERVAL -4 DAY)),
  (1007, 6, 3, DATE_ADD(CURDATE(), INTERVAL -3 DAY), '13:50', '14:10', 'Mụn trứng cá nặng',               'completed',   DATE_ADD(CURDATE(), INTERVAL -5 DAY)),
  (1008, 9, 5, DATE_ADD(CURDATE(), INTERVAL -2 DAY), '14:30', '15:00', 'Hồi hộp, tim đập nhanh',          'cancelled',   DATE_ADD(CURDATE(), INTERVAL -4 DAY)),
  (1009, 10, 1, DATE_ADD(CURDATE(), INTERVAL -2 DAY), '09:00', '09:30', 'Đau bụng âm ỉ vùng thượng vị',  'completed',   DATE_ADD(CURDATE(), INTERVAL -3 DAY)),
  (1010, 8, 2, DATE_ADD(CURDATE(), INTERVAL -1 DAY), '10:00', '10:30', 'Bé quấy khóc, biếng ăn',          'rejected',    DATE_ADD(CURDATE(), INTERVAL -2 DAY)),
  (1011, 1, 4, CURDATE(),                             '14:00', '14:30', 'Ù tai, nghe kém một bên',         'confirmed',   DATE_ADD(CURDATE(), INTERVAL -2 DAY)),
  (1012, 3, 1, CURDATE(),                             '08:30', '09:00', 'Tái khám định kỳ',                'in_progress', DATE_ADD(CURDATE(), INTERVAL -3 DAY)),
  (1013, 2, 3, CURDATE(),                             '13:50', '14:10', 'Viêm da tiếp xúc',                'pending',     CURDATE()),
  (1014, 6, 5, DATE_ADD(CURDATE(), INTERVAL 1 DAY),  '08:00', '08:30', 'Kiểm tra huyết áp cao',           'confirmed',   DATE_ADD(CURDATE(), INTERVAL -1 DAY)),
  (1015, 4, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY),  '09:30', '10:00', 'Tiêm phòng định kỳ cho bé',       'confirmed',   DATE_ADD(CURDATE(), INTERVAL -1 DAY)),
  (1016, 10, 6, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  '08:30', '09:00', 'Đau lưng kéo dài',               'pending',     CURDATE()),
  (1017, 5, 4, DATE_ADD(CURDATE(), INTERVAL 2 DAY),  '14:00', '14:30', 'Viêm xoang tái phát',             'pending',     CURDATE()),
  (1018, 9, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY),  '08:00', '08:30', 'Mệt mỏi kéo dài, mất ngủ',       'pending',     CURDATE()),
  (1019, 7, 3, DATE_ADD(CURDATE(), INTERVAL 4 DAY),  '13:30', '13:50', 'Chàm da cơ địa',                  'confirmed',   DATE_ADD(CURDATE(), INTERVAL -1 DAY)),
  (1020, 8, 5, DATE_ADD(CURDATE(), INTERVAL 5 DAY),  '08:30', '09:00', 'Khám tim mạch tổng quát',         'pending',     CURDATE())
ON DUPLICATE KEY UPDATE `reason` = VALUES(`reason`);

-- ─────────────── MEDICAL RECORDS ────────────────────────────────────────────
INSERT INTO `medical_record` (`id`, `appointment_id`, `patient_id`, `doctor_id`, `symptoms`, `diagnosis`, `notes`, `follow_up_date`, `created_at`) VALUES
  (501, 1001, 1,  1, 'Đau đầu, sốt nhẹ 2 ngày, hơi chóng mặt',                      'Cảm cúm thông thường',                                         'Nghỉ ngơi, uống nhiều nước, theo dõi nhiệt độ.',                          DATE_ADD(CURDATE(), INTERVAL 4 DAY),   DATE_ADD(CURDATE(), INTERVAL -6 DAY)),
  (502, 1002, 2,  5, 'Đau tức ngực trái khi gắng sức, khó thở nhẹ',                   'Thiếu máu cơ tim cục bộ nghi ngờ, cần theo dõi thêm',          'Hạn chế vận động mạnh, tái khám sau 2 tuần kèm điện tâm đồ.',            DATE_ADD(CURDATE(), INTERVAL 9 DAY),   DATE_ADD(CURDATE(), INTERVAL -5 DAY)),
  (503, 1003, 3,  3, 'Nổi mẩn đỏ, ngứa nhiều vùng tay và thân mình',                  'Viêm da dị ứng',                                               'Tránh tiếp xúc xà phòng mạnh, dùng kem dưỡng ẩm.',                      NULL,                                   DATE_ADD(CURDATE(), INTERVAL -5 DAY)),
  (504, 1004, 7,  2, 'Sốt 38.5°C, ho có đờm, chảy mũi',                               'Viêm phế quản cấp',                                            'Theo dõi sốt tại nhà, tái khám nếu sốt trên 3 ngày.',                    DATE_ADD(CURDATE(), INTERVAL -1 DAY),  DATE_ADD(CURDATE(), INTERVAL -4 DAY)),
  (505, 1005, 4,  4, 'Đau rát họng, khó nuốt, ho khan',                                'Viêm họng cấp',                                                'Súc miệng nước muối ấm, hạn chế đồ lạnh.',                               NULL,                                   DATE_ADD(CURDATE(), INTERVAL -4 DAY)),
  (506, 1006, 5,  1, 'Không có triệu chứng bất thường',                                'Sức khỏe ổn định',                                             'Duy trì chế độ ăn uống lành mạnh, tái khám định kỳ 6 tháng/lần.',        DATE_ADD(CURDATE(), INTERVAL 180 DAY), DATE_ADD(CURDATE(), INTERVAL -3 DAY)),
  (507, 1007, 6,  3, 'Mụn viêm đỏ, mụn mủ nhiều ở vùng mặt',                          'Mụn trứng cá mức độ trung bình - nặng',                        'Vệ sinh da đúng cách, tránh nặn mụn, tái khám sau 3 tuần.',              DATE_ADD(CURDATE(), INTERVAL 18 DAY),  DATE_ADD(CURDATE(), INTERVAL -3 DAY)),
  (508, 1009, 10, 1, 'Đau âm ỉ vùng thượng vị, ợ chua sau ăn',                         'Viêm dạ dày cấp',                                              'Ăn uống điều độ, tránh đồ cay nóng, rượu bia.',                          DATE_ADD(CURDATE(), INTERVAL 10 DAY),  DATE_ADD(CURDATE(), INTERVAL -2 DAY))
ON DUPLICATE KEY UPDATE `diagnosis` = VALUES(`diagnosis`);

-- ─────────────── PRESCRIPTIONS ──────────────────────────────────────────────
INSERT INTO `prescription` (`id`, `medical_record_id`) VALUES
  (701, 501), (702, 502), (703, 503), (704, 504), (705, 505), (707, 507), (708, 508)
ON DUPLICATE KEY UPDATE `medical_record_id` = VALUES(`medical_record_id`);

INSERT INTO `prescription_detail` (`prescription_id`, `medicine_name`, `dosage`, `quantity`, `usage_instruction`) VALUES
  (701, 'Paracetamol 500mg',            '1 viên x 3 lần/ngày',    10, 'Uống sau ăn'),
  (701, 'Vitamin C 1000mg',             '1 viên/ngày',             7,  'Uống buổi sáng'),
  (702, 'Aspirin 81mg',                 '1 viên/ngày',            14, 'Uống sau ăn sáng'),
  (702, 'Atorvastatin 20mg',            '1 viên/tối',             14, 'Uống trước khi ngủ'),
  (703, 'Cetirizine 10mg',              '1 viên/tối',              5, 'Uống sau ăn tối'),
  (703, 'Kem bôi Hydrocortisone 1%',    'Bôi 2 lần/ngày',          1, 'Bôi vùng da tổn thương'),
  (704, 'Amoxicillin 500mg',            '1 viên x 3 lần/ngày',    21, 'Uống đủ liều 7 ngày'),
  (704, 'Siro ho Prospan',              '10ml x 2 lần/ngày',       1, 'Uống sau ăn'),
  (705, 'Alphachymotrypsin',            '2 viên x 2 lần/ngày',     8, 'Ngậm dưới lưỡi'),
  (707, 'Doxycycline 100mg',            '1 viên/ngày',            21, 'Uống sau ăn, tránh nắng'),
  (707, 'Gel trị mụn Benzoyl Peroxide', 'Bôi tối trước khi ngủ',   1, 'Tránh vùng mắt'),
  (708, 'Omeprazole 20mg',              '1 viên/ngày',            14, 'Uống trước ăn sáng 30 phút'),
  (708, 'Domperidone 10mg',             '1 viên x 2 lần/ngày',    14, 'Uống trước ăn')
ON DUPLICATE KEY UPDATE `dosage` = VALUES(`dosage`);

-- ─────────────── INVOICES ───────────────────────────────────────────────────
INSERT INTO `invoice` (`id`, `appointment_id`, `patient_id`, `amount`, `status`, `created_at`, `paid_at`) VALUES
  (901, 1001, 1,  285000,  'paid',   DATE_ADD(CURDATE(), INTERVAL -6 DAY), DATE_ADD(CURDATE(), INTERVAL -6 DAY)),
  (902, 1002, 2,  570000,  'paid',   DATE_ADD(CURDATE(), INTERVAL -5 DAY), DATE_ADD(CURDATE(), INTERVAL -5 DAY)),
  (903, 1003, 3,  315000,  'paid',   DATE_ADD(CURDATE(), INTERVAL -5 DAY), DATE_ADD(CURDATE(), INTERVAL -4 DAY)),
  (904, 1004, 7,  360000,  'paid',   DATE_ADD(CURDATE(), INTERVAL -4 DAY), DATE_ADD(CURDATE(), INTERVAL -4 DAY)),
  (905, 1005, 4,  245000,  'unpaid', DATE_ADD(CURDATE(), INTERVAL -4 DAY), NULL),
  (906, 1006, 5,  350000,  'paid',   DATE_ADD(CURDATE(), INTERVAL -3 DAY), DATE_ADD(CURDATE(), INTERVAL -3 DAY)),
  (907, 1007, 6,  430000,  'unpaid', DATE_ADD(CURDATE(), INTERVAL -3 DAY), NULL),
  (908, 1009, 10, 295000,  'unpaid', DATE_ADD(CURDATE(), INTERVAL -2 DAY), NULL),
  (909, 1011, 1,  260000,  'unpaid', CURDATE(),                            NULL)
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

INSERT INTO `invoice_detail` (`invoice_id`, `label`, `amount`) VALUES
  (901, 'Phí khám Nội tổng quát', 200000), (901, 'Thuốc kê đơn', 85000),
  (902, 'Phí khám Tim mạch',      300000), (902, 'Điện tâm đồ', 150000), (902, 'Thuốc kê đơn', 120000),
  (903, 'Phí khám Da liễu',       250000), (903, 'Thuốc kê đơn', 65000),
  (904, 'Phí khám Nhi khoa',      220000), (904, 'Thuốc kê đơn', 140000),
  (905, 'Phí khám TMH',           200000), (905, 'Thuốc kê đơn', 45000),
  (906, 'Khám sức khỏe định kỳ',  350000),
  (907, 'Phí khám Da liễu',       250000), (907, 'Thuốc kê đơn', 180000),
  (908, 'Phí khám Nội tổng quát', 200000), (908, 'Thuốc kê đơn', 95000),
  (909, 'Phí khám Tai Mũi Họng',  200000), (909, 'Thuốc kê đơn', 60000)
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`);

-- ─────────────── NOTIFICATIONS ──────────────────────────────────────────────
INSERT INTO `notification` (`patient_id`, `appointment_id`, `type`, `text`, `is_read`) VALUES
  (1, 1011, 'appointment_confirmed', CONCAT('Lịch hẹn với BS. Nguyễn Đức Minh ngày ', CURDATE(), ' lúc 14:00 đã được xác nhận.'), 0),
  (8, 1010, 'appointment_rejected',  CONCAT('Rất tiếc, lịch hẹn với BS. Lê Văn Cường ngày ', DATE_ADD(CURDATE(), INTERVAL -1 DAY), ' lúc 10:00 đã bị từ chối. Vui lòng đặt lại lịch khác.'), 0),
  (6, 1014, 'appointment_confirmed', CONCAT('Lịch hẹn với BS.CKI Đỗ Thanh Tùng ngày ', DATE_ADD(CURDATE(), INTERVAL 1 DAY), ' lúc 08:00 đã được xác nhận.'), 1)
ON DUPLICATE KEY UPDATE `text` = VALUES(`text`);
