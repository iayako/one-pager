import json
import re
import sqlite3
import time
import urllib.parse
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "car_selector.db"
SCHEMA_PATH = Path(__file__).resolve().parents[1] / "car_selector_schema.sql"
VPIC_BASE = "https://vpic.nhtsa.dot.gov/api/vehicles"
WIKI_API = "https://en.wikipedia.org/w/api.php"

TARGET_MAKES = [
    "toyota",
    "honda",
    "nissan",
    "mazda",
    "subaru",
    "mitsubishi",
    "suzuki",
    "lexus",
    "acura",
    "infiniti",
]
TARGET_PER_MAKE = 10
YEARS_TO_SCAN = list(range(2025, 1989, -1))


def fetch_json(url: str, retries: int = 3) -> dict:
    for attempt in range(retries + 1):
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "one-pager-seeder/1.0",
                "Accept": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            # Wikipedia is rate-limited more aggressively; degrade to fallback image.
            if "wikipedia.org" in url and error.code in (403, 429):
                return {}
            raise
        except urllib.error.URLError:
            if attempt < retries:
                time.sleep(1.5 * (attempt + 1))
                continue
            raise
    return {}


def slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower())
    return cleaned.strip("-") or "x"


def get_models_for_make_year(make: str, year: int) -> list[dict]:
    url = (
        f"{VPIC_BASE}/GetModelsForMakeYear/make/{urllib.parse.quote(make)}"
        f"/modelyear/{year}?format=json"
    )
    payload = fetch_json(url)
    return payload.get("Results") or []


def get_models_for_make(make: str) -> list[dict]:
    url = f"{VPIC_BASE}/GetModelsForMake/{urllib.parse.quote(make)}?format=json"
    payload = fetch_json(url)
    return payload.get("Results") or []


def fetch_wikipedia_image(title: str) -> str | None:
    params = {
        "action": "query",
        "prop": "pageimages",
        "piprop": "original",
        "titles": title,
        "format": "json",
    }
    url = f"{WIKI_API}?{urllib.parse.urlencode(params)}"
    payload = fetch_json(url)
    pages = (payload.get("query") or {}).get("pages") or {}
    for page in pages.values():
        source = (page.get("original") or {}).get("source")
        if isinstance(source, str) and source:
            return source
    return None


def fetch_wikipedia_search_titles(query: str, limit: int = 5) -> list[str]:
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": str(limit),
        "format": "json",
    }
    url = f"{WIKI_API}?{urllib.parse.urlencode(params)}"
    payload = fetch_json(url)
    items = (payload.get("query") or {}).get("search") or []
    titles = []
    for item in items:
        title = item.get("title")
        if isinstance(title, str) and title:
            titles.append(title)
    return titles


def resolve_vehicle_photo(make: str, model: str, year: int) -> tuple[str, str]:
    unsplash_like = (
        "https://source.unsplash.com/1600x900/?"
        + urllib.parse.quote(f"{make} {model} car")
    )
    return unsplash_like, "unsplash-fallback"


def ensure_schema(conn: sqlite3.Connection):
    conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))


def collect_make_models(make: str, per_make: int) -> list[dict]:
    picked: list[dict] = []
    seen_models: set[str] = set()
    for year in YEARS_TO_SCAN:
        rows = get_models_for_make_year(make, year)
        for row in rows:
            model = str(row.get("Model_Name") or "").strip()
            if not model:
                continue
            key = model.lower()
            if key in seen_models:
                continue
            seen_models.add(key)
            picked.append({"model": model, "model_year": year})
            if len(picked) >= per_make:
                return picked

    if len(picked) < per_make:
        fallback_models = get_models_for_make(make)
        fallback_year = 2015
        for row in fallback_models:
            model = str(row.get("Model_Name") or "").strip()
            if not model:
                continue
            key = model.lower()
            if key in seen_models:
                continue
            seen_models.add(key)
            picked.append({"model": model, "model_year": fallback_year})
            if len(picked) >= per_make:
                return picked
    return picked


def upsert_vehicle(conn: sqlite3.Connection, make: str, model: str, model_year: int) -> int:
    age_years = datetime.now().year - model_year
    synthetic_vin = f"VPIC-{slugify(make)}-{slugify(model)}-{model_year}"
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
            source_payload_json=excluded.source_payload_json
        """,
        (
            synthetic_vin,
            make.upper(),
            model,
            model_year,
            age_years,
            "unknown",
            None,
            None,
            None,
            None,
            None,
            "vpic:GetModelsForMakeYear",
            json.dumps({"make": make, "model": model, "model_year": model_year}, ensure_ascii=False),
        ),
    )
    conn.commit()
    row = conn.execute("SELECT id FROM vehicles WHERE vin = ?", (synthetic_vin,)).fetchone()
    if row is None:
        raise RuntimeError("Cannot read inserted vehicle id")
    return int(row[0])


def upsert_image(conn: sqlite3.Connection, vehicle_id: int, image_url: str, source_name: str):
    existing = conn.execute(
        "SELECT id FROM vehicle_images WHERE vehicle_id = ? AND is_primary = 1 LIMIT 1",
        (vehicle_id,),
    ).fetchone()
    if existing is None:
        conn.execute(
            """
            INSERT INTO vehicle_images (vehicle_id, image_url, source_name, is_primary)
            VALUES (?, ?, ?, 1)
            """,
            (vehicle_id, image_url, source_name),
        )
    else:
        conn.execute(
            """
            UPDATE vehicle_images
            SET image_url = ?, source_name = ?
            WHERE id = ?
            """,
            (image_url, source_name, int(existing[0])),
        )
    conn.commit()


def main():
    conn = sqlite3.connect(DB_PATH)
    try:
        ensure_schema(conn)
        total_seeded = 0
        for make in TARGET_MAKES:
            vehicles = collect_make_models(make, TARGET_PER_MAKE)
            for item in vehicles:
                canonical_make = make.upper()
                vid = upsert_vehicle(conn, canonical_make, item["model"], item["model_year"])
                image_url, source = resolve_vehicle_photo(canonical_make, item["model"], item["model_year"])
                upsert_image(conn, vid, image_url, source)
                total_seeded += 1
            print(f"{make}: seeded {len(vehicles)} vehicles")

        print(f"Done. Seeded vehicles: {total_seeded}")
        count = conn.execute("SELECT COUNT(*) FROM vehicles").fetchone()[0]
        img_count = conn.execute("SELECT COUNT(*) FROM vehicle_images").fetchone()[0]
        print(f"DB totals -> vehicles: {count}, images: {img_count}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

