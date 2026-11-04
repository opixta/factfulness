from __future__ import annotations

from functools import lru_cache

from app.config import settings
from app.storage.base import ObjectStorage
from app.storage.filesystem import FilesystemObjectStorage
from app.storage.memory import MemoryObjectStorage
from app.storage.s3 import S3ObjectStorage

_memory_singleton: MemoryObjectStorage | None = None


@lru_cache
def get_storage() -> ObjectStorage:
    global _memory_singleton
    backend = settings.storage_backend.lower()
    if backend == "memory":
        if _memory_singleton is None:
            _memory_singleton = MemoryObjectStorage(
                quarantine_bucket=settings.s3_quarantine_bucket,
                clean_bucket=settings.s3_clean_bucket,
            )
        return _memory_singleton
    if backend == "filesystem":
        return FilesystemObjectStorage()
    if backend == "s3":
        if not settings.s3_endpoint_url or not settings.s3_access_key_id:
            raise RuntimeError("S3 storage requires S3_ENDPOINT_URL and credentials")
        return S3ObjectStorage(
            endpoint_url=settings.s3_endpoint_url,
            access_key=settings.s3_access_key_id,
            secret_key=settings.s3_secret_access_key,
            quarantine_bucket=settings.s3_quarantine_bucket,
            clean_bucket=settings.s3_clean_bucket,
            region=settings.s3_region,
        )
    raise ValueError(f"Unknown STORAGE_BACKEND: {backend}")


def reset_storage_for_tests() -> None:
    global _memory_singleton
    _memory_singleton = None
    get_storage.cache_clear()
