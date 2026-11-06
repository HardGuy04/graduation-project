-- Chạy bằng tài khoản quản trị (root), KHÔNG dùng clinic_app.
-- Ghi nhận lần đăng nhập sai để giới hạn dò mật khẩu (sống sót qua restart server).
USE clinic;

CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ip` varchar(45) NOT NULL,
  `login_key` varchar(255) NOT NULL,
  `failed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_ip` (`ip`,`failed_at`),
  KEY `idx_login_attempts_key` (`login_key`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
