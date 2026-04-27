import re
import sqlite3
import urllib.parse
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "car_selector.db"


def tagify(text: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().lower()
    return cleaned.replace(" ", ",")


def build_demo_image_url(vehicle_id: int, make: str, model: str) -> str:
    tags = ",".join(filter(None, [tagify(make), tagify(model), "car"]))
    if not tags:
        tags = "car"
    # lock=<id> makes image deterministic per vehicle
    return (
        f"https://loremflickr.com/640/360/{urllib.parse.quote(tags, safe=',')}?lock={vehicle_id}"
    )


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute("SELECT id, make, model FROM vehicles ORDER BY id").fetchall()
        updated = 0
        for row in rows:
            vehicle_id = int(row["id"])
            make = str(row["make"] or "")
            model = str(row["model"] or "")
            image_url = build_demo_image_url(vehicle_id, make, model)

            existing = conn.execute(
                "SELECT id FROM vehicle_images WHERE vehicle_id = ? AND is_primary = 1 LIMIT 1",
                (vehicle_id,),
            ).fetchone()
            if existing is None:
                conn.execute(
                    "INSERT INTO vehicle_images (vehicle_id, image_url, source_name, is_primary) VALUES (?, ?, ?, 1)",
                    (vehicle_id, image_url, "loremflickr-demo"),
                )
            else:
                conn.execute(
                    "UPDATE vehicle_images SET image_url = ?, source_name = ? WHERE id = ?",
                    (image_url, "loremflickr-demo", int(existing["id"])),
                )
            updated += 1
        conn.commit()
        print(f"Updated image rows: {updated}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

