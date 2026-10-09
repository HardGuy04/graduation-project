-- Chạy bằng tài khoản quản trị (root), KHÔNG dùng clinic_app.
-- Lệnh nạp ví qua cổng thanh toán (VNPay): idempotent theo txn_ref.
USE clinic;

CREATE TABLE IF NOT EXISTS `payment_intent` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `patient_id` bigint unsigned NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `provider` varchar(20) NOT NULL DEFAULT 'VNPAY',
  `txn_ref` varchar(64) NOT NULL,
  `status` enum('PENDING','PAID','FAILED') NOT NULL DEFAULT 'PENDING',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payment_txn` (`txn_ref`),
  KEY `idx_payment_patient` (`patient_id`,`created_at`),
  CONSTRAINT `fk_payment_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`),
  CONSTRAINT `ck_payment_amount` CHECK ((`amount` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
