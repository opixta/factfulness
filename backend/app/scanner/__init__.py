from functools import lru_cache

from app.config import settings
from app.scanner.base import VirusScanner
from app.scanner.clamd import AlwaysCleanScanner, ClamdScanner, FakeScanner


@lru_cache
def get_scanner() -> VirusScanner:
    mode = settings.scanner_backend.lower()
    if mode == "fake":
        return FakeScanner()
    if mode == "always_clean":
        return AlwaysCleanScanner()
    if mode == "clamd":
        return ClamdScanner()
    raise ValueError(f"Unknown SCANNER_BACKEND: {mode}")


def reset_scanner_for_tests() -> None:
    get_scanner.cache_clear()
