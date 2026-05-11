"""Mapbox geocoding for SF tow addresses."""
import logging
from urllib.parse import quote

import requests

log = logging.getLogger(__name__)

MAPBOX_URL = "https://api.mapbox.com/geocoding/v5/mapbox.places/{query}.json"


def geocode(address: str, token: str) -> tuple[float | None, float | None]:
    """
    Returns (lat, lng) or (None, None) on failure.
    Note: Mapbox coordinates are [longitude, latitude].
    """
    if not address:
        return None, None
    query = quote(f"{address}, San Francisco, CA")
    url = MAPBOX_URL.format(query=query)
    try:
        resp = requests.get(url, params={"access_token": token, "limit": 1}, timeout=10)
        resp.raise_for_status()
        features = resp.json().get("features", [])
        if not features:
            log.warning("Geocoding returned no results for: %s", address)
            return None, None
        lng, lat = features[0]["geometry"]["coordinates"]
        return float(lat), float(lng)
    except Exception as e:
        log.warning("Geocoding failed for '%s': %s", address, e)
        return None, None
