import json
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "car_selector.db"
SCHEMA_PATH = Path(__file__).resolve().parents[1] / "car_selector_schema.sql"
VPIC_BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended"


def fetch_vpic_vehicle(vin: str) -> dict:
    url = f"{VPIC_BASE_URL}/{urllib.parse.quote(vin)}?format=json"
    with urllib.request.urlopen(url, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    results = payload.get("Results") or []
    if not results:
        raise ValueError("vPIC returned empty Results")
    return results[0]


def as_float(value: str):
    if value is None or value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def as_int(value: str):
    if value is None or value == "":
        return None
    try:
        return int(value)
    except ValueError:
        return None


def infer_engine_type(fuel_type: str) -> str:
    if not fuel_type:
        return "unknown"
    lower = fuel_type.lower()
    if "hybrid" in lower:
        return "hybrid"
    if "gasoline" in lower or "petrol" in lower:
        return "gasoline_ice"
    if "diesel" in lower:
        return "diesel_ice"
    if "electric" in lower:
        return "electric"
    return "other"


def init_db(conn: sqlite3.Connection):
    schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
    conn.executescript(schema_sql)


def save_vehicle(conn: sqlite3.Connection, vin: str, vehicle: dict) -> int:
    model_year = as_int(vehicle.get("ModelYear"))
    if model_year is None:
        raise ValueError("ModelYear is missing in vPIC response")

    now_year = datetime.now().year
    age_years = now_year - model_year
    fuel_type_primary = vehicle.get("FuelTypePrimary") or None
    engine_type = infer_engine_type(fuel_type_primary or "")

    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO vehicles (
            vin, make, model, model_year, age_years, engine_type,
            engine_displacement_l, engine_hp, fuel_type_primary,
            body_class, drive_type, source_api, source_payload_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(vin) DO UPDATE SET
            make=excluded.make,
            model=excluded.model,
            model_year=excluded.model_year,
            age_years=excluded.age_years,
            engine_type=excluded.engine_type,
            engine_displacement_l=excluded.engine_displacement_l,
            engine_hp=excluded.engine_hp,
            fuel_type_primary=excluded.fuel_type_primary,
            body_class=excluded.body_class,
            drive_type=excluded.drive_type,
            source_api=excluded.source_api,
            source_payload_json=excluded.source_payload_json
        """,
        (
            vin,
            vehicle.get("Make") or "UNKNOWN",
            vehicle.get("Model") or "UNKNOWN",
            model_year,
            age_years,
            engine_type,
            as_float(vehicle.get("DisplacementL")),
            as_float(vehicle.get("EngineHP")),
            fuel_type_primary,
            vehicle.get("BodyClass") or None,
            vehicle.get("DriveType") or None,
            VPIC_BASE_URL,
            json.dumps(vehicle, ensure_ascii=False),
        ),
    )
    conn.commit()

    row = conn.execute("SELECT id FROM vehicles WHERE vin = ?", (vin,)).fetchone()
    if row is None:
        raise RuntimeError("Inserted vehicle was not found")
    return int(row[0])


def print_vehicle_summary(conn: sqlite3.Connection, vehicle_id: int):
    row = conn.execute(
        """
        SELECT
            id, vin, make, model, model_year, age_years, engine_type,
            engine_displacement_l, engine_hp, fuel_type_primary
        FROM vehicles
        WHERE id = ?
        """,
        (vehicle_id,),
    ).fetchone()
    if row is None:
        return
    print("Saved vehicle:")
    print(f"  id: {row[0]}")
    print(f"  vin: {row[1]}")
    print(f"  make/model: {row[2]} {row[3]}")
    print(f"  model_year: {row[4]}")
    print(f"  age_years: {row[5]}")
    print(f"  engine_type: {row[6]}")
    print(f"  displacement_l: {row[7]}")
    print(f"  engine_hp: {row[8]}")
    print(f"  fuel_type_primary: {row[9]}")


def main():
    vin = sys.argv[1] if len(sys.argv) > 1 else "JTDEPRAE3LJ012345"
    try:
        vehicle = fetch_vpic_vehicle(vin)
    except urllib.error.URLError as error:
        raise SystemExit(f"Failed to call vPIC API: {error}") from error

    conn = sqlite3.connect(DB_PATH)
    try:
        init_db(conn)
        vehicle_id = save_vehicle(conn, vin, vehicle)
        print_vehicle_summary(conn, vehicle_id)
        print(f"Database: {DB_PATH}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

