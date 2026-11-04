import json
from pathlib import Path

import pytest

from app.scoring.config import MIN_ELIGIBLE_SAME_DIR
from app.scoring.fact_score import fact_score
from app.scoring.types import EvidenceInput

FIXTURES = Path(__file__).resolve().parents[2] / "fixtures" / "golden_evidence.json"


@pytest.fixture(scope="module")
def golden() -> dict[str, list[EvidenceInput]]:
    with FIXTURES.open(encoding="utf-8") as f:
        return json.load(f)


def test_c1_lie(golden: dict[str, list[EvidenceInput]]) -> None:
    result = fact_score(golden["c1"])
    assert result["status"] == "lie"
    assert result["gatePassed"] is True
    assert result["eligibleFalse"] >= MIN_ELIGIBLE_SAME_DIR


def test_c2_fact(golden: dict[str, list[EvidenceInput]]) -> None:
    result = fact_score(golden["c2"])
    assert result["status"] == "fact"
    assert result["gatePassed"] is True
    assert result["eligibleTrue"] >= MIN_ELIGIBLE_SAME_DIR


def test_c3_pending(golden: dict[str, list[EvidenceInput]]) -> None:
    result = fact_score(golden["c3"])
    assert result["status"] == "pending"
    assert result["gatePassed"] is False
