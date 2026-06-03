-- Статистика расчётов калькулятора (вводы и выводы JSON).
-- Выполните один раз на сервере: mysql -u ... -p ... < api/schema.sql

CREATE TABLE IF NOT EXISTS calculation_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  calculation_config_version_id BIGINT UNSIGNED NULL,
  inputs_json JSON NOT NULL,
  outputs_json JSON NOT NULL,
  client_ip VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  INDEX idx_calculation_log_created (created_at),
  INDEX idx_calculation_log_config_version (calculation_config_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Заявки от пользователей после расчёта (контакт + параметры расчёта из формы).
CREATE TABLE IF NOT EXISTS lead_request (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(80) NULL,
  phone VARCHAR(25) NOT NULL,
  contact_method ENUM('phone', 'telegram', 'whatsapp') NOT NULL DEFAULT 'phone',
  comment VARCHAR(300) NULL,
  calculation_log_id BIGINT UNSIGNED NULL,
  calculation_snapshot_json JSON NULL,
  client_ip VARCHAR(45) NULL,
  user_agent VARCHAR(512) NULL,
  auction_price_yen DECIMAL(15,2) NULL COMMENT 'Цена авто на аукционе, ¥',
  vehicle_age VARCHAR(32) NULL COMMENT 'under3 | 3to5 | over5',
  engine_type VARCHAR(32) NULL COMMENT 'gasoline | hybrid',
  auction_name VARCHAR(160) NULL,
  engine_cc DECIMAL(12,2) NULL COMMENT 'Объём см³',
  engine_hp DECIMAL(12,2) NULL COMMENT 'Мощность л.с.',
  INDEX idx_lead_request_created (created_at),
  INDEX idx_lead_request_calc_id (calculation_log_id),
  CONSTRAINT fk_lead_request_calc_log
    FOREIGN KEY (calculation_log_id) REFERENCES calculation_log(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Администраторы закрытой страницы настройки расчёта.
CREATE TABLE IF NOT EXISTS admin_user (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_admin_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Версии схемы расчёта: черновики и опубликованные конфигурации.
CREATE TABLE IF NOT EXISTS calculation_config_version (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at TIMESTAMP NULL,
  created_by_admin_id BIGINT UNSIGNED NULL,
  status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
  name VARCHAR(160) NOT NULL,
  config_json JSON NOT NULL,
  note VARCHAR(500) NULL,
  INDEX idx_calc_config_status_updated (status, updated_at),
  CONSTRAINT fk_calc_config_admin
    FOREIGN KEY (created_by_admin_id) REFERENCES admin_user(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Единственная активная опубликованная версия для публичного калькулятора.
CREATE TABLE IF NOT EXISTS calculation_config_active (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  calculation_config_version_id BIGINT UNSIGNED NOT NULL,
  activated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_by_admin_id BIGINT UNSIGNED NULL,
  CONSTRAINT chk_calc_config_active_singleton CHECK (id = 1),
  CONSTRAINT fk_calc_config_active_version
    FOREIGN KEY (calculation_config_version_id) REFERENCES calculation_config_version(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_calc_config_active_admin
    FOREIGN KEY (activated_by_admin_id) REFERENCES admin_user(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
