"""
Find My Towed Car — Autura/AutoReturn scraper.
Designed to run for ~4.5 minutes per GitHub Actions invocation (every 5 min cron).
Resumes from Supabase max vehicle_id on restart.
"""
import logging
import os
import random
import time
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import parse_qs, urlparse

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

BASE_URL = "https://search.autoreturn.com"
SEARCH_URL = BASE_URL + "/find-vehicle/results?regionState=CA&region=San+Francisco%2C+CA&towDate={date}"
DETAIL_URL = BASE_URL + "/find-vehicle/details?vehicle={id}"

MAX_RUN_SECONDS = 270  # 4.5 min — exits before the next 5-min GHA trigger
SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 (compatible; FindMyTowedCar/1.0)"})


def jitter_sleep(base: float, jitter: float = 3.0) -> None:
    time.sleep(base + random.uniform(0, jitter))


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


def find_todays_start_id(today: str) -> int:
    """
    Polls the SF search results page until at least one vehicle appears today.
    Returns the vehicle_id of the first result.
    """
    url = SEARCH_URL.format(date=today)
    while True:
        try:
            resp = SESSION.get(url, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            links = soup.select("a.ar-button-red")
            if links:
                href = links[0]["href"]
                vid = int(parse_qs(urlparse(href).query)["vehicle"][0])
                log.info("Found today's first SF vehicle_id: %d", vid)
                return vid
        except Exception as e:
            log.warning("Error fetching search results: %s", e)
        log.info("No SF tows found yet for %s. Retrying in 60s.", today)
        time.sleep(60)


def main() -> None:
    today = datetime.now(ZoneInfo("America/Los_Angeles")).date().isoformat()
    start_time = time.monotonic()

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    log.info("Scraper started. Today: %s", today)

    # Resume from persisted pointer (survives runs with zero SF tows found)
    pointer = db.get_pointer(client)
    if pointer:
        log.info("Resuming from persisted pointer=%d.", pointer)
    else:
        # First ever run — find today's first SF tow
        pointer = find_todays_start_id(today) - 1
        log.info("First ever run. Starting from vehicle_id=%d.", pointer)

    consecutive_errors = 0
    last_confirmed = pointer  # last ID that actually existed (SF or not)

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

        # Page exists — update confirmed floor regardless of city
        consecutive_errors = 0
        last_confirmed = next_id

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
    # Save last confirmed (existing) ID so frontier gaps get re-checked next run
    db.save_pointer(client, last_confirmed)
    log.info("Scraper exiting after %.1fs. Last confirmed: %d, final pointer: %d.", elapsed, last_confirmed, pointer)


if __name__ == "__main__":
    main()
