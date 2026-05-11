"""Parse AutoReturn/Autura detail pages into structured dicts."""
import re
from datetime import datetime
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

SF_TZ = ZoneInfo("America/Los_Angeles")
UTC = ZoneInfo("UTC")

ERROR_SENTINEL = "ERROR"
_YEAR_RE = re.compile(r"^\d{4}$")


def _extract_fields(soup: BeautifulSoup) -> dict:
    """Build label→value dict from the colorAlternate row layout."""
    data = {}
    for row in soup.select("div.p-2.w-full.flex.colorAlternate"):
        # Use recursive=False to get only direct children divs — CSS :last-child
        # pseudo-selectors don't scope reliably in BeautifulSoup.
        divs = row.find_all("div", recursive=False)
        if len(divs) >= 2:
            label = divs[0].get_text(strip=True).rstrip(":")
            data[label] = divs[1].get_text(separator="\n", strip=True)
    return data


def _parse_license(raw: str) -> tuple[str | None, str | None]:
    """'8TPP576 - CA' → ('8TPP576', 'CA')"""
    m = re.match(r"(.+?)\s*-\s*(\w+)", raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return raw.strip() or None, None


def _parse_vehicle(raw: str) -> tuple[str | None, int | None, str | None, str | None]:
    """'BLUE  TOYOTA CAMRY' or 'GRAY 2024 FORD MUSTANG' → (color, year, make, model)"""
    tokens = raw.split()
    if not tokens:
        return None, None, None, None
    color = tokens[0].upper()
    rest = tokens[1:]
    year = None
    if rest and _YEAR_RE.match(rest[0]):
        year = int(rest[0])
        rest = rest[1:]
    make = rest[0] if rest else None
    model = " ".join(rest[1:]) if len(rest) > 1 else None
    return color, year, make, model


def _parse_towed_at(raw: str) -> str | None:
    """'5/10/26, 2:17 PM' → ISO8601 UTC string."""
    try:
        # strptime on Linux accepts %-m/%-d/%y; use lstrip-zero approach instead
        dt_naive = datetime.strptime(raw, "%m/%d/%y, %I:%M %p")
    except ValueError:
        try:
            # Try zero-padded fallback
            dt_naive = datetime.strptime(raw, "%m/%d/%Y, %I:%M %p")
        except ValueError:
            return None
    dt_sf = dt_naive.replace(tzinfo=SF_TZ)
    return dt_sf.astimezone(UTC).isoformat()


def _parse_reason(raw: str) -> str:
    """'500/500E 500/500E - Blocking Driveway' → 'Blocking Driveway'"""
    if " - " in raw:
        return raw.split(" - ", 1)[1].strip()
    return raw.strip()


def _parse_tow_company(raw: str) -> tuple[str | None, str | None]:
    """
    Raw text (newline-separated) from the Tow Company span.
    Returns (company_name, full_address_line_containing_SF).
    """
    lines = [ln.strip() for ln in raw.splitlines() if ln.strip()]
    name = lines[0] if lines else None
    address = next((ln for ln in lines if "San Francisco, CA" in ln), None)
    return name, address


def is_error_page(soup: BeautifulSoup) -> bool:
    alert = soup.select_one('div[role="alert"]')
    return alert is not None and "An error has occurred" in alert.get_text()


def parse_detail_page(html: str, vehicle_id: int) -> dict | str | None:
    """
    Returns:
        ERROR_SENTINEL  — page is an error (ID doesn't exist yet)
        None            — valid page but not an SF tow
        dict            — parsed SF tow data (without vehicle_id, lat, lng)
    """
    soup = BeautifulSoup(html, "html.parser")

    if is_error_page(soup):
        return ERROR_SENTINEL

    data = _extract_fields(soup)
    if not data:
        return None

    # SF filter via tow company address
    tow_company_raw = data.get("Tow Company", "")
    tow_company_name, tow_company_address = _parse_tow_company(tow_company_raw)
    if not tow_company_address:
        return None  # not SF

    license_raw = data.get("License", "")
    license_plate, state = _parse_license(license_raw)

    vehicle_raw = data.get("Vehicle", "")
    color, year, make, model = _parse_vehicle(vehicle_raw)

    towed_at = _parse_towed_at(data.get("Towed Date and Time", ""))
    if towed_at is None:
        return None  # can't store without a timestamp

    reason_raw = data.get("Reason", "")
    reason = _parse_reason(reason_raw) if reason_raw else None

    return {
        "tr_number": data.get("TR Number"),
        "license": license_plate,
        "state": state,
        "color": color,
        "year": year,
        "make": make,
        "model": model,
        "vin_last4": data.get("VIN") or None,
        "towed_at": towed_at,
        "towed_by": data.get("Towed By") or None,
        "towed_from": data.get("Towed From") or None,
        "reason": reason,
        "status": data.get("Status") or None,
        "tow_company": tow_company_name,
        "tow_company_address": tow_company_address,
    }
