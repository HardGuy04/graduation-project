-- Chạy bằng tài khoản quản trị (root), KHÔNG dùng clinic_app. Chạy SAU 003_payment_intent.sql.
-- Thanh toán hóa đơn trực tiếp qua VNPay + lưu thông tin đối soát giao dịch. Chỉ thêm, không xóa/đổi tên.
USE clinic;

ALTER TABLE `invoice`
  MODIFY `payment_method` enum('CASH','CARD','TRANSFER','WALLET','VNPAY') DEFAULT NULL;

ALTER TABLE `payment_intent`
  ADD COLUMN `purpose` enum('TOPUP','INVOICE') NOT NULL DEFAULT 'TOPUP' AFTER `provider`,
  ADD COLUMN `invoice_id` bigint unsigned DEFAULT NULL AFTER `patient_id`,
  ADD COLUMN `expires_at` datetime DEFAULT NULL AFTER `created_at`,
  ADD COLUMN `response_code` varchar(4) DEFAULT NULL,
  ADD COLUMN `transaction_no` varchar(32) DEFAULT NULL,
  ADD COLUMN `bank_code` varchar(20) DEFAULT NULL,
  ADD KEY `idx_payment_invoice` (`invoice_id`, `status`),
  ADD CONSTRAINT `fk_payment_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`);
