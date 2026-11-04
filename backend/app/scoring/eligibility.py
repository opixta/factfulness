from app.scoring.config import TRUST_MIN
from app.scoring.types import EvidenceInput


def has_evidence_source(e: EvidenceInput) -> bool:
    if e.get("url") and str(e["url"]).strip():
        return True
    if e.get("fileId"):
        return e.get("fileScanStatus") == "clean"
    return False


def is_evidence_eligible(evidence: EvidenceInput) -> bool:
    return (
        evidence.get("stance") != "neutral"
        and has_evidence_source(evidence)
        and int(evidence.get("trust", 0)) >= TRUST_MIN
    )


def filter_eligible_evidence(evidence: list[EvidenceInput]) -> list[EvidenceInput]:
    return [e for e in evidence if is_evidence_eligible(e)]
