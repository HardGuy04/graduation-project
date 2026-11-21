-- Chạy bằng tài khoản quản trị (root), KHÔNG dùng clinic_app.
-- Phần "Giới thiệu bản thân" của bác sĩ, hiển thị cho bệnh nhân khi chọn bác sĩ đặt lịch. Chỉ thêm cột.
USE clinic;

ALTER TABLE `doctor`
  ADD COLUMN `bio` varchar(1000) DEFAULT NULL AFTER `degree`;
