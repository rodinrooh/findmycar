"""Supabase operations for the tow scraper."""
import logging

log = logging.getLogger(__name__)


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
