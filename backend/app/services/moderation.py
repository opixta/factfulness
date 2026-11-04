from pathlib import Path

from fastapi import HTTPException, status

_REPO_ROOT = Path(__file__).resolve().parents[3]
_BANNED_PATH = _REPO_ROOT / "backend" / "config" / "banned_words.txt"

_words: list[str] | None = None


def _load_words() -> list[str]:
    global _words
    if _words is not None:
        return _words
    if not _BANNED_PATH.exists():
        _words = []
        return _words
    lines = []
    for line in _BANNED_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            lines.append(line)
    _words = lines
    return _words


def normalize(text: str) -> str:
    import unicodedata

    return (
        unicodedata.normalize("NFKC", text)
        .lower()
        .replace("\u200b", "")
        .replace("\u200c", "")
        .replace("\u200d", "")
        .replace("\ufeff", "")
    )


def assert_comment_allowed(body: str) -> None:
    normalized = normalize(body)
    for word in _load_words():
        w = normalize(word)
        if not w:
            continue
        if w.isascii():
            import re

            if re.search(rf"(^|[^a-z0-9]){re.escape(w)}([^a-z0-9]|$)", normalized):
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail={"code": "COMMENT_BANNED", "message": "Comment contains banned text"},
                )
        elif len(w) >= 2 and w in normalized:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "COMMENT_BANNED", "message": "Comment contains banned text"},
            )
