from fastapi import APIRouter

from app.scoring.config import (
    FACT_THRESHOLD,
    MIN_ELIGIBLE_SAME_DIR,
    RULE_VERSION,
    TRUST_MIN,
)

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/config/scoring")
def scoring_config() -> dict:
    return {
        "trustMin": TRUST_MIN,
        "minEligibleSameDir": MIN_ELIGIBLE_SAME_DIR,
        "factThreshold": FACT_THRESHOLD,
        "ruleVersion": RULE_VERSION,
    }
