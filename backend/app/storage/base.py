from typing import Protocol


class ObjectStorage(Protocol):
    quarantine_bucket: str
    clean_bucket: str

    def presign_put(
        self,
        bucket: str,
        key: str,
        *,
        content_type: str,
        expires_in: int,
    ) -> str: ...

    def presign_get(self, bucket: str, key: str, *, expires_in: int) -> str: ...

    def head_object(self, bucket: str, key: str) -> dict: ...

    def get_object_bytes(self, bucket: str, key: str) -> bytes: ...

    def put_object(self, bucket: str, key: str, body: bytes, *, content_type: str) -> None: ...

    def copy_object(self, src_bucket: str, src_key: str, dest_bucket: str, dest_key: str) -> None: ...

    def delete_object(self, bucket: str, key: str) -> None: ...
