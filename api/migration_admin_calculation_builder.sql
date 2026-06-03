-- Миграция для админки формул и версий расчёта.
-- Выполните на уже существующей БД один раз:
--   mysql -u ... -p ... < api/migration_admin_calculation_builder.sql

ALTER TABLE calculation_log
  ADD COLUMN calculation_config_version_id BIGINT UNSIGNED NULL AFTER created_at,
  ADD INDEX idx_calculation_log_config_version (calculation_config_version_id);

CREATE TABLE IF NOT EXISTS admin_user (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_admin_user_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
