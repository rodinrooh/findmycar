"""
Find My Towed Car — Autura/AutoReturn scraper.
Designed to run for ~4.5 minutes per GitHub Actions invocation (every 5 min cron).
Resumes from Supabase max vehicle_id on restart.
"""
import logging
import os
import random
import time
import requests
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

DETAIL_URL = "https://search.autoreturn.com/find-vehicle/details?vehicle={id}"

MAX_RUN_SECONDS = 270  # 4.5 min — exits before the next 5-min GHA trigger
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compatible; FindMyTowedCar/1.0)"})



def fetch_with_retry(vehicle_id: int) -> dict | str | None:
    """
    Fetches a detail page and parses it.
    Returns: ERROR_SENTINEL | None (other city) | dict (SF tow)
    Retries up to 3x with exponential backoff on network errors.
    Returns None on repeated failure (pointer advances, we move on).
    """
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


def main() -> None:
    start_time = time.monotonic()

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Scraper started.")

    # Resume from persisted pointer (survives runs with zero SF tows found)
    pointer = db.get_pointer(client)
    if pointer:
        log.info("Resuming from persisted pointer=%d.", pointer)
    else:
        # scraper_state table missing or empty — fall back to global max SF tow
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

        # SF tow — geocode + upsert
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


if __name__ == "__main__":
    main()
