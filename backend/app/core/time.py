"""Time helpers. The database stores UTC; the clinic operates in Asia/Dhaka."""

from datetime import UTC, date, datetime, time, timedelta
from zoneinfo import ZoneInfo

CLINIC_TZ = ZoneInfo("Asia/Dhaka")


def utcnow() -> datetime:
    return datetime.now(UTC)


def clinic_today() -> date:
    return datetime.now(CLINIC_TZ).date()


def to_clinic(dt: datetime) -> datetime:
    return dt.astimezone(CLINIC_TZ)


def clinic_day_bounds_utc(day: date) -> tuple[datetime, datetime]:
    """Return the half-open interval [start, end) of a clinic-local day, in UTC."""
    start = datetime.combine(day, time.min, tzinfo=CLINIC_TZ)
    end = start + timedelta(days=1)
    return start.astimezone(UTC), end.astimezone(UTC)
