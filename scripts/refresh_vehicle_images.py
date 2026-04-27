import json
import sqlite3
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "car_selector.db"
WIKI_API = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "one-pager-image-refresh/1.0"
PLACEHOLDER_IMAGE = (
    "data:image/svg+xml;charset=utf-8,"
    "%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22640%22%20height%3D%22360%22%20viewBox%3D%220%200%20640%20360%22%3E"
    "%3Crect%20width%3D%22640%22%20height%3D%22360%22%20fill%3D%22%2314253f%22/%3E"
    "%3Ctext%20x%3D%2250%25%22%20y%3D%2248%25%22%20fill%3D%22%23e8ecf4%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%3EPhoto%20Unavailable%3C/text%3E"
    "%3C/svg%3E"
)


def fetch_json(url: str, retries: int = 4) -> dict | None:
    for attempt in range(retries + 1):
        req = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            if error.code in (429, 503, 502, 504) and attempt < retries:
                time.sleep(1.5 + attempt * 0.75)
                continue
            return None
        except (urllib.error.URLError, ConnectionResetError, TimeoutError, OSError):
            if attempt < retries:
                time.sleep(1.5 + attempt * 0.75)
                continue
            return None
    return None


def wikipedia_image_by_title(title: str) -> str | None:
    params = {
        "action": "query",
        "prop": "pageimages",
        "piprop": "original",
        "titles": title,
        "format": "json",
    }
    url = f"{WIKI_API}?{urllib.parse.urlencode(params)}"
    payload = fetch_json(url)
    if not isinstance(payload, dict):
        return None
    pages = (payload.get("query") or {}).get("pages") or {}
    if not isinstance(pages, dict):
        return None
    for page in pages.values():
        src = (page.get("original") or {}).get("source")
        if isinstance(src, str) and src:
            return src
    return None


def wikipedia_search_titles(query: str, limit: int = 6) -> list[str]:
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": str(limit),
        "format": "json",
    }
    url = f"{WIKI_API}?{urllib.parse.urlencode(params)}"
    payload = fetch_json(url)
    if not isinstance(payload, dict):
        return []
    results = (payload.get("query") or {}).get("search") or []
    titles: list[str] = []
    if isinstance(results, list):
        for item in results:
            title = (item or {}).get("title")
            if isinstance(title, str) and title:
                titles.append(title)
    return titles


def resolve_working_image(make: str, model: str, year: int) -> str | None:
    title_candidates = [
        f"{make} {model} ({year})",
        f"{make} {model}",
        f"{make} {model} car",
    ]
    for title in title_candidates:
        src = wikipedia_image_by_title(title)
        if src and "upload.wikimedia.org" in src:
            return src

    query_candidates = [
        f"{make} {model} {year} car",
        f"{make} {model} car",
    ]
    for query in query_candidates:
        for title in wikipedia_search_titles(query):
            src = wikipedia_image_by_title(title)
            if src and "upload.wikimedia.org" in src:
                return src

    return None


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        vehicles = conn.execute(
            """
            SELECT id, make, model, model_year
            FROM vehicles
            ORDER BY id
            """
        ).fetchall()

        updated = 0
        placeholder_set = 0
        skipped = 0

        for row in vehicles:
            vehicle_id = int(row["id"])
            make = str(row["make"] or "").strip()
            model = str(row["model"] or "").strip()
            year = int(row["model_year"] or 0)
            if not make or not model or year <= 0:
                skipped += 1
                continue

            try:
                new_image = resolve_working_image(make, model, year)
            except Exception as exc:
                print(f"id={vehicle_id} {make} {model}: {exc}")
                skipped += 1
                continue

            existing = conn.execute(
                "SELECT id, image_url FROM vehicle_images WHERE vehicle_id = ? AND is_primary = 1 LIMIT 1",
                (vehicle_id,),
            ).fetchone()

            if new_image:
                if existing is None:
                    conn.execute(
                        "INSERT INTO vehicle_images (vehicle_id, image_url, source_name, is_primary) VALUES (?, ?, ?, 1)",
                        (vehicle_id, new_image, "wikipedia"),
                    )
                else:
                    conn.execute(
                        "UPDATE vehicle_images SET image_url = ?, source_name = ? WHERE id = ?",
                        (new_image, "wikipedia", int(existing["id"])),
                    )
                updated += 1
            else:
                if existing is not None:
                    conn.execute(
                        "UPDATE vehicle_images SET image_url = ?, source_name = ? WHERE id = ?",
                        (PLACEHOLDER_IMAGE, "placeholder", int(existing["id"])),
                    )
                    placeholder_set += 1
                else:
                    conn.execute(
                        "INSERT INTO vehicle_images (vehicle_id, image_url, source_name, is_primary) VALUES (?, ?, ?, 1)",
                        (vehicle_id, PLACEHOLDER_IMAGE, "placeholder"),
                    )
                    placeholder_set += 1

            conn.commit()
            time.sleep(0.2)

        working_count = conn.execute(
            """
            SELECT COUNT(*)
            FROM vehicle_images
            WHERE image_url IS NOT NULL AND image_url != ''
            """
        ).fetchone()[0]

        print(f"Vehicles processed: {len(vehicles)}")
        print(f"Updated working images: {updated}")
        print(f"Set placeholders: {placeholder_set}")
        print(f"Skipped: {skipped}")
        print(f"Images currently set: {working_count}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

