def opinion_score(votes_true: int, votes_false: int) -> dict[str, int | float]:
    total = votes_true + votes_false
    if not total:
        return {"pct": 0, "total": 0, "trueShare": 0.0}
    true_share = votes_true / total
    return {"pct": round(true_share * 100), "total": total, "trueShare": true_share}
