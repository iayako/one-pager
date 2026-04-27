import json
import sqlite3
import urllib.parse
import urllib.request
from pathlib import Path


DB_PATH = Path(__file__).resolve().parents[1] / "car_selector.db"
WIKI_API = "https://en.wikipedia.org/w/api.php"
UA = "one-pager-make-image-refresh/1.0"

PLACEHOLDER_IMAGE = (
    "data:image/svg+xml;charset=utf-8,"
    "%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22640%22%20height%3D%22360%22%20viewBox%3D%220%200%20640%20360%22%3E"
    "%3Crect%20width%3D%22640%22%20height%3D%22360%22%20fill%3D%22%2314253f%22/%3E"
    "%3Ctext%20x%3D%2250%25%22%20y%3D%2248%25%22%20fill%3D%22%23e8ecf4%22%20font-size%3D%2228%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%3EPhoto%20Unavailable%3C/text%3E"
    "%3C/svg%3E"
)

TARGET_MAKES = [
    "TOYOTA",
    "HONDA",
    "NISSAN",
    "MAZDA",
    "SUBARU",
    "MITSUBISHI",
    "SUZUKI",
    "LEXUS",
    "ACURA",
    "INFINITI",
]


def fetch_json(url: str) -> dict | None:
    req = urllib.request.Request(
        url,
        headers={"User-Agent": UA, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return None


def wikipedia_search_titles(query: str, limit: int = 5) -> list[str]:
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srlimit": str(limit),
        "format": "json",
    }
    payload = fetch_json(f"{WIKI_API}?{urllib.parse.urlencode(params)}")
    if not isinstance(payload, dict):
        return []
    rows = ((payload.get("query") or {}).get("search") or [])
    out: list[str] = []
    if isinstance(rows, list):
        for item in rows:
            title = (item or {}).get("title")
            if isinstance(title, str) and title:
                out.append(title)
    return out


def wikipedia_image_by_title(title: str) -> str | None:
    params = {
        "action": "query",
        "prop": "pageimages",
        "piprop": "original",
        "titles": title,
        "format": "json",
    }
    payload = fetch_json(f"{WIKI_API}?{urllib.parse.urlencode(params)}")
    if not isinstance(payload, dict):
        return None
    pages = ((payload.get("query") or {}).get("pages") or {})
    if not isinstance(pages, dict):
        return None
    for page in pages.values():
        src = ((page.get("original") or {}).get("source"))
        if isinstance(src, str) and src and "upload.wikimedia.org" in src:
            return src
    return None


def resolve_make_image(make: str) -> str:
    candidates = [f"{make} car", make]
    for query in candidates:
        titles = wikipedia_search_titles(query, limit=6)
        for title in titles:
            src = wikipedia_image_by_title(title)
            if src:
                return src
    return PLACEHOLDER_IMAGE


def main():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        make_to_image: dict[str, str] = {}
        for make in TARGET_MAKES:
            make_to_image[make] = resolve_make_image(make)
            print(f"{make}: image resolved")

        vehicles = conn.execute(
            "SELECT id, make FROM vehicles ORDER BY id"
        ).fetchall()
        updated = 0
        for row in vehicles:
            vid = int(row["id"])
            make = str(row["make"] or "").upper()
            image_url = make_to_image.get(make, PLACEHOLDER_IMAGE)
            source_name = "wikipedia-make" if image_url != PLACEHOLDER_IMAGE else "placeholder"

            existing = conn.execute(
                "SELECT id FROM vehicle_images WHERE vehicle_id = ? AND is_primary = 1 LIMIT 1",
                (vid,),
            ).fetchone()
            if existing is None:
                conn.execute(
                    "INSERT INTO vehicle_images (vehicle_id, image_url, source_name, is_primary) VALUES (?, ?, ?, 1)",
                    (vid, image_url, source_name),
                )
            else:
                conn.execute(
                    "UPDATE vehicle_images SET image_url = ?, source_name = ? WHERE id = ?",
                    (image_url, source_name, int(existing["id"])),
                )
            updated += 1
        conn.commit()
        print(f"Updated rows: {updated}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()

