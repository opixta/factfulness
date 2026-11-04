from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class MemoryObjectStorage:
    quarantine_bucket: str = "quarantine"
    clean_bucket: str = "clean"
    _objects: dict[tuple[str, str], tuple[bytes, str]] = field(default_factory=dict)

    def presign_put(
        self,
        bucket: str,
        key: str,
        *,
        content_type: str,
        expires_in: int,
    ) -> str:
        return f"memory://put/{bucket}/{key}?type={content_type}"

    def presign_get(self, bucket: str, key: str, *, expires_in: int) -> str:
        return f"memory://get/{bucket}/{key}"

    def head_object(self, bucket: str, key: str) -> dict:
        item = self._objects.get((bucket, key))
        if not item:
            raise FileNotFoundError(key)
        body, _ct = item
        return {"ContentLength": len(body)}

    def get_object_bytes(self, bucket: str, key: str) -> bytes:
        item = self._objects.get((bucket, key))
        if not item:
            raise FileNotFoundError(key)
        return item[0]

    def put_object(self, bucket: str, key: str, body: bytes, *, content_type: str) -> None:
        self._objects[(bucket, key)] = (body, content_type)

    def copy_object(self, src_bucket: str, src_key: str, dest_bucket: str, dest_key: str) -> None:
        body, ct = self._objects[(src_bucket, src_key)]
        self._objects[(dest_bucket, dest_key)] = (body, ct)

    def delete_object(self, bucket: str, key: str) -> None:
        self._objects.pop((bucket, key), None)

    def handle_memory_put(self, url: str, body: bytes) -> None:
        """Test helper: memory://put/bucket/key?type=..."""
        if not url.startswith("memory://put/"):
            raise ValueError("Not a memory put URL")
        path = url.removeprefix("memory://put/")
        bucket_key, _, qs = path.partition("?")
        bucket, _, key = bucket_key.partition("/")
        ct = "application/octet-stream"
        if qs.startswith("type="):
            ct = qs.split("=", 1)[1]
        self.put_object(bucket, key, body, content_type=ct)
