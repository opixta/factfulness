from __future__ import annotations

import shutil
from pathlib import Path

from app.config import settings


class FilesystemObjectStorage:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root or Path(settings.filesystem_storage_root)
        self.quarantine_bucket = settings.s3_quarantine_bucket
        self.clean_bucket = settings.s3_clean_bucket
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, bucket: str, key: str) -> Path:
        safe = key.lstrip("/").replace("..", "_")
        return self.root / bucket / safe

    def presign_put(
        self,
        bucket: str,
        key: str,
        *,
        content_type: str,
        expires_in: int,
    ) -> str:
        return f"file://put/{bucket}/{key}?type={content_type}"

    def presign_get(self, bucket: str, key: str, *, expires_in: int) -> str:
        return f"file://get/{bucket}/{key}"

    def head_object(self, bucket: str, key: str) -> dict:
        p = self._path(bucket, key)
        if not p.exists():
            raise FileNotFoundError(key)
        return {"ContentLength": p.stat().st_size}

    def get_object_bytes(self, bucket: str, key: str) -> bytes:
        return self._path(bucket, key).read_bytes()

    def put_object(self, bucket: str, key: str, body: bytes, *, content_type: str) -> None:
        p = self._path(bucket, key)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(body)

    def copy_object(self, src_bucket: str, src_key: str, dest_bucket: str, dest_key: str) -> None:
        src = self._path(src_bucket, src_key)
        dest = self._path(dest_bucket, dest_key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)

    def delete_object(self, bucket: str, key: str) -> None:
        p = self._path(bucket, key)
        if p.exists():
            p.unlink()
