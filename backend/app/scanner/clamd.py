import socket

from app.config import settings
from app.scanner.base import EICAR, ScanOutcome, VirusScanner


class ClamdScanner:
    """Scan bytes via clamd INSTREAM (TCP)."""

    def __init__(self, host: str | None = None, port: int | None = None) -> None:
        self.host = host or settings.clamav_host
        self.port = port or settings.clamav_port

    def scan(self, data: bytes) -> ScanOutcome:
        with socket.create_connection((self.host, self.port), timeout=30) as sock:
            sock.sendall(b"zINSTREAM\0")
            chunk_size = 8192
            offset = 0
            while offset < len(data):
                chunk = data[offset : offset + chunk_size]
                offset += len(chunk)
                sock.sendall(len(chunk).to_bytes(4, "big") + chunk)
            sock.sendall(b"\0\0\0\0")
            response = sock.recv(4096).decode("utf-8", errors="replace")
        if "FOUND" in response.upper():
            return ScanOutcome.INFECTED
        return ScanOutcome.CLEAN


class FakeScanner:
    """Test scanner: EICAR bytes → infected, else clean."""

    def scan(self, data: bytes) -> ScanOutcome:
        if EICAR in data or data.strip().startswith(b"X5O!P%@AP"):
            return ScanOutcome.INFECTED
        return ScanOutcome.CLEAN


class AlwaysCleanScanner:
    def scan(self, data: bytes) -> ScanOutcome:
        return ScanOutcome.CLEAN
