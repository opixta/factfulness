from urllib.parse import urlparse

from app.scoring.types import EvidenceInput


def source_domain(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        host = host.lower()
        if host.startswith("www."):
            return host[4:]
        return host
    except Exception:
        return url.strip().lower()


def evidence_source_key(e: EvidenceInput) -> str:
    if e.get("fileId"):
        return f"file:{e['fileId']}"
    url = e.get("url")
    if url:
        return source_domain(url)
    return "unknown"


def distinct_source_count(items: list[EvidenceInput]) -> int:
    return len({evidence_source_key(e) for e in items})


def aggregate_source_weights(items: list[EvidenceInput]) -> tuple[int, int]:
    true_by_key: dict[str, int] = {}
    false_by_key: dict[str, int] = {}
    for e in items:
        key = evidence_source_key(e)
        stance = e.get("stance")
        trust = int(e.get("trust", 0))
        if stance == "true":
            true_by_key[key] = true_by_key.get(key, 0) + trust
        elif stance == "false":
            false_by_key[key] = false_by_key.get(key, 0) + trust
    w_true = sum(true_by_key.values())
    w_false = sum(false_by_key.values())
    return w_true, w_false
