-- Добавление полей параметров авто в существующую БД (однократно).
-- mysql -u ... -p ... < api/migration_lead_client_fields.sql

ALTER TABLE lead_request
  ADD COLUMN auction_price_yen DECIMAL(15,2) NULL COMMENT 'Цена авто на аукционе, ¥' AFTER user_agent,
  ADD COLUMN vehicle_age VARCHAR(32) NULL COMMENT 'under3 | 3to5 | over5' AFTER auction_price_yen,
  ADD COLUMN engine_type VARCHAR(32) NULL COMMENT 'gasoline | hybrid' AFTER vehicle_age,
  ADD COLUMN auction_name VARCHAR(160) NULL AFTER engine_type,
  ADD COLUMN engine_cc DECIMAL(12,2) NULL COMMENT 'Объём см³' AFTER auction_name,
  ADD COLUMN engine_hp DECIMAL(12,2) NULL COMMENT 'Мощность л.с.' AFTER engine_cc;
