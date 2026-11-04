from datetime import datetime, timezone
from urllib.parse import urlparse


def build_wayback_archive_url(original_url: str, captured_at: datetime | None = None) -> str:
    trimmed = original_url.strip()
    when = captured_at or datetime.now(timezone.utc)
    ts = when.strftime("%Y%m%d%H%M%S")
    return f"https://web.archive.org/web/{ts}/{trimmed}"


def site_name_from_url(url: str) -> str | None:
    try:
        host = urlparse(url).hostname or ""
        return host.replace("www.", "") or None
    except Exception:
        return None
