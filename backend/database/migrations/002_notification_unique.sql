-- Chạy bằng tài khoản quản trị (root), KHÔNG dùng clinic_app.
-- Một lịch hẹn chỉ có tối đa 1 thông báo mỗi loại (nhắc lịch không bị nhân đôi khi chạy nhiều tiến trình).
-- appointment_id NULL vẫn cho phép nhiều dòng (MySQL unique bỏ qua NULL).
USE clinic;

ALTER TABLE `notification`
  ADD UNIQUE KEY `uq_notif_appt_type` (`appointment_id`, `type`);
