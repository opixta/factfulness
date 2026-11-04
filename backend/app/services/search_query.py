import unicodedata


def normalize_search_query(query: str) -> str:
    return unicodedata.normalize("NFKC", query).strip().lower()


def ilike_pattern(normalized_query: str) -> str:
    """Escape LIKE metacharacters for PostgreSQL ILIKE."""
    escaped = (
        normalized_query.replace("\\", "\\\\")
        .replace("%", "\\%")
        .replace("_", "\\_")
    )
    return f"%{escaped}%"
