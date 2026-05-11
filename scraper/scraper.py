"""
Find My Towed Car — scraper.
Fetches today's SF tow list from AutoReturn, stores any new ones in Supabase.
"""
import logging
import os
import time
from datetime import datetime
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

import db
import geocoder
import parser as tow_parser

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
MAPBOX_TOKEN = os.environ["MAPBOX_TOKEN"]

SEARCH_URL = "https://search.autoreturn.com/find-vehicle/results?regionState=CA&region=San+Francisco%2C+CA&towDate={date}"
DETAIL_URL = "https://search.autoreturn.com/find-vehicle/details?vehicle={id}"

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compatible; FindMyTowedCar/1.0)"})


def get_todays_ids(today: str) -> list[int]:
    """Fetch today's SF search page and return all vehicle IDs."""
    resp = SESSION.get(SEARCH_URL.format(date=today), timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    ids = []
    for link in soup.select("a.ar-button-red"):
        href = link.get("href", "")
        try:
            vid = int(parse_qs(urlparse(href).query)["vehicle"][0])
            ids.append(vid)
        except (KeyError, ValueError):
            continue
    return ids


def fetch_and_store(client, vehicle_id: int) -> None:
    try:
        resp = SESSION.get(DETAIL_URL.format(id=vehicle_id), timeout=15)
        resp.raise_for_status()
        result = tow_parser.parse_detail_page(resp.text, vehicle_id)
    except Exception as e:
        log.warning("Failed to fetch vehicle_id=%d: %s", vehicle_id, e)
        return

    if not result or result == tow_parser.ERROR_SENTINEL:
        log.info("vehicle_id=%d: no data.", vehicle_id)
        return

    lat, lng = geocoder.geocode(result["towed_from"], MAPBOX_TOKEN)
    result["vehicle_id"] = vehicle_id
    result["lat"] = lat
    result["lng"] = lng
    db.upsert_tow(client, result)


def main() -> None:
    today = datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Scraper started. Today: %s", today)

    try:
        page_ids = get_todays_ids(today)
    except Exception as e:
        log.error("Failed to fetch search page: %s", e)
        return

    if not page_ids:
        log.info("No tows found on search page for %s.", today)
        return

    log.info("Search page has %d tows.", len(page_ids))

    stored = db.get_stored_ids(client, page_ids)
    missing = [vid for vid in page_ids if vid not in stored]

    if not missing:
        log.info("All %d tows already in Supabase.", len(page_ids))
        return

    log.info("%d new tows to store: %s", len(missing), missing)
    for vid in missing:
        fetch_and_store(client, vid)
        time.sleep(1)

    log.info("Done.")


if __name__ == "__main__":
    main()
