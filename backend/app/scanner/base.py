from enum import Enum
from typing import Protocol


class ScanOutcome(str, Enum):
    CLEAN = "clean"
    INFECTED = "infected"


class VirusScanner(Protocol):
    def scan(self, data: bytes) -> ScanOutcome: ...


EICAR = (
    b"X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"
)
