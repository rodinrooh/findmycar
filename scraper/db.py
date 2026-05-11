"""Supabase operations for the tow scraper."""
import logging

log = logging.getLogger(__name__)


def get_global_max_id(client) -> int | None:
    """Returns the highest vehicle_id ever stored, for day-rollover resume."""
    try:
        resp = (
            client.table("tows")
            .select("vehicle_id")
            .order("vehicle_id", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            return resp.data[0]["vehicle_id"]
    except Exception as e:
        log.error("Failed to query global max ID: %s", e)
    return None


def get_resume_id(client, today_iso: str) -> int | None:
    """
    Returns the max vehicle_id already stored for today, or None.
    Used to resume scraping without re-fetching already-stored records.
    """
    try:
        resp = (
            client.table("tows")
            .select("vehicle_id")
            .gte("towed_at", f"{today_iso}T00:00:00+00:00")
            .order("vehicle_id", desc=True)
            .limit(1)
            .execute()
        )
        if resp.data:
            return resp.data[0]["vehicle_id"]
    except Exception as e:
        log.error("Failed to query resume ID: %s", e)
    return None


def upsert_tow(client, tow: dict) -> None:
    """Upsert a tow record keyed on vehicle_id. Logs errors without raising."""
    try:
        client.table("tows").upsert(tow, on_conflict="vehicle_id").execute()
        log.info(
            "Upserted vehicle_id=%s (%s %s %s from %s)",
            tow.get("vehicle_id"),
            tow.get("color"),
            tow.get("make"),
            tow.get("model"),
            tow.get("towed_from"),
        )
    except Exception as e:
        log.error("Supabase upsert failed for vehicle_id=%s: %s", tow.get("vehicle_id"), e)
