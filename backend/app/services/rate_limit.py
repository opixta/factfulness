from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock

from fastapi import HTTPException, status

from app.config import settings

_lock = Lock()
_buckets: dict[str, list[float]] = defaultdict(list)


def _prune(key: str, window_seconds: float) -> None:
    now = time.time()
    cutoff = now - window_seconds
    _buckets[key] = [t for t in _buckets[key] if t >= cutoff]


def check_rate_limit(key: str, *, limit: int, window_seconds: float) -> None:
    with _lock:
        _prune(key, window_seconds)
        if len(_buckets[key]) >= limit:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS,
                detail="RATE_LIMIT_EXCEEDED",
            )
        _buckets[key].append(time.time())


def rate_limit_evidence_upload(user_id: str) -> None:
    check_rate_limit(
        f"file-upload:{user_id}",
        limit=settings.rate_file_upload_per_user_per_hour,
        window_seconds=3600,
    )


def rate_limit_evidence_create(user_id: str) -> None:
    check_rate_limit(
        f"evidence:{user_id}",
        limit=settings.rate_evidence_create_per_user_per_hour,
        window_seconds=3600,
    )


def reset_rate_limits_for_tests() -> None:
    with _lock:
        _buckets.clear()
