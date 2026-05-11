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


def get_pointer(client) -> int | None:
    """Returns the last saved scraper pointer (persists across runs regardless of SF tows found)."""
    try:
        resp = client.table("scraper_state").select("last_pointer").eq("id", 1).execute()
        if resp.data:
            return resp.data[0]["last_pointer"]
    except Exception as e:
        log.error("Failed to get pointer: %s", e)
    return None


def save_pointer(client, pointer: int) -> None:
    """Persist the scraper pointer so the next run resumes from here."""
    from datetime import datetime, timezone
    try:
        client.table("scraper_state").upsert(
            {"id": 1, "last_pointer": pointer, "updated_at": datetime.now(timezone.utc).isoformat()}
        ).execute()
    except Exception as e:
        log.error("Failed to save pointer: %s", e)


def get_stored_ids(client, vehicle_ids: list[int]) -> set[int]:
    """Returns which of the given vehicle_ids are already in Supabase."""
    try:
        resp = (
            client.table("tows")
            .select("vehicle_id")
            .in_("vehicle_id", vehicle_ids)
            .execute()
        )
        return {row["vehicle_id"] for row in resp.data}
    except Exception as e:
        log.error("Failed to query stored IDs: %s", e)
    return set()


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
