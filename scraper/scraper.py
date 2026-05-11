"""
Find My Towed Car — Autura/AutoReturn scraper.
Runs for ~4.5 min per GitHub Actions invocation (every 5 min cron).
Resumes via persisted pointer. Reconciles against search page each run
to catch cars whose IDs appeared in AutoReturn after we passed them.
"""
import logging
import os
import random
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

MAX_RUN_SECONDS = 270
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compatible; FindMyTowedCar/1.0)"})


def fetch_with_retry(vehicle_id: int) -> dict | str | None:
    for attempt in range(3):
        try:
            resp = SESSION.get(DETAIL_URL.format(id=vehicle_id), timeout=15)
            if resp.status_code == 429:
                log.warning("Rate limited (429). Sleeping 5 minutes.")
                time.sleep(300)
                continue
            resp.raise_for_status()
            return tow_parser.parse_detail_page(resp.text, vehicle_id)
        except requests.RequestException as e:
            wait = 5 * (2 ** attempt)
            log.warning("Network error fetching ID %d (attempt %d): %s. Retrying in %ds.", vehicle_id, attempt + 1, e, wait)
            time.sleep(wait)
    log.error("Giving up on vehicle_id=%d after 3 retries.", vehicle_id)
    return None


def reconcile(client: object, today: str) -> None:
    """
    Fetch today's SF search page, find any vehicle_ids not yet in Supabase,
    and store them. Catches cars whose AutoReturn entries appeared after
    the sequential scraper already passed their ID.
    """
    try:
        resp = SESSION.get(SEARCH_URL.format(date=today), timeout=15)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        links = soup.select("a.ar-button-red")
        page_ids = set()
        for link in links:
            href = link.get("href", "")
            try:
                vid = int(parse_qs(urlparse(href).query)["vehicle"][0])
                page_ids.add(vid)
            except (KeyError, ValueError):
                continue
    except Exception as e:
        log.warning("Reconcile: failed to fetch search page: %s", e)
        return

    if not page_ids:
        log.info("Reconcile: no results on search page for %s.", today)
        return

    stored_ids = db.get_stored_ids(client, list(page_ids))
    missing = page_ids - stored_ids
    if not missing:
        log.info("Reconcile: all %d search-page IDs already stored.", len(page_ids))
        return

    log.info("Reconcile: %d missing IDs to backfill: %s", len(missing), sorted(missing))
    for vid in sorted(missing):
        result = fetch_with_retry(vid)
        if result and result != tow_parser.ERROR_SENTINEL:
            lat, lng = geocoder.geocode(result["towed_from"], MAPBOX_TOKEN)
            result["vehicle_id"] = vid
            result["lat"] = lat
            result["lng"] = lng
            db.upsert_tow(client, result)
        time.sleep(1)


def main() -> None:
    start_time = time.monotonic()
    today = datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Scraper started. Today: %s", today)

    pointer = db.get_pointer(client)
    if pointer:
        log.info("Resuming from persisted pointer=%d.", pointer)
    else:
        pointer = db.get_global_max_id(client) or 0
        log.info("No persisted pointer. Falling back to global max vehicle_id=%d.", pointer)

    consecutive_errors = 0

    while time.monotonic() - start_time < MAX_RUN_SECONDS:
        next_id = pointer + 1
        log.info("Trying vehicle_id=%d …", next_id)

        result = fetch_with_retry(next_id)

        if result == tow_parser.ERROR_SENTINEL:
            consecutive_errors += 1
            if consecutive_errors >= 3:
                log.info("vehicle_id=%d skipped after %d attempts (gap).", next_id, consecutive_errors)
                pointer = next_id
                consecutive_errors = 0
                time.sleep(random.uniform(1, 3))
            else:
                log.info("vehicle_id=%d does not exist yet (attempt %d). Sleeping 10s.", next_id, consecutive_errors)
                time.sleep(10)
            continue

        consecutive_errors = 0

        if result is None:
            log.info("vehicle_id=%d is not SF. Advancing.", next_id)
            pointer = next_id
            time.sleep(random.uniform(1, 3))
            continue

        lat, lng = geocoder.geocode(result["towed_from"], MAPBOX_TOKEN)
        result["vehicle_id"] = next_id
        result["lat"] = lat
        result["lng"] = lng
        db.upsert_tow(client, result)
        pointer = next_id
        time.sleep(random.uniform(1, 3))

    elapsed = time.monotonic() - start_time
    db.save_pointer(client, pointer)
    log.info("Scraper exiting after %.1fs. Final pointer: %d.", elapsed, pointer)

    reconcile(client, today)


if __name__ == "__main__":
    main()
