-- SQLite schema for car selector demo data

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vin TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year INTEGER NOT NULL,
  age_years INTEGER NOT NULL,
  engine_type TEXT,
  engine_displacement_l REAL,
  engine_hp REAL,
  fuel_type_primary TEXT,
  body_class TEXT,
  drive_type TEXT,
  source_api TEXT NOT NULL,
  source_payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vehicle_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vehicles_make_model_year
  ON vehicles(make, model, model_year);

