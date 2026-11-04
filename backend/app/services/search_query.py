import unicodedata


def normalize_search_query(query: str) -> str:
    return unicodedata.normalize("NFKC", query).strip().lower()
