-- Статистика расчётов калькулятора (вводы и выводы JSON).
-- Выполните один раз на сервере: mysql -u ... -p ... < api/schema.sql

CREATE TABLE IF NOT EXISTS calculation_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  inputs_json JSON NOT NULL,
  outputs_json JSON NOT NULL,
  client_ip VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  INDEX idx_calculation_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
