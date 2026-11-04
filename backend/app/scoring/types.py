from typing import Literal, TypedDict

Stance = Literal["true", "false", "neutral"]
FactStatus = Literal["pending", "fact", "lie", "split"]
FileScanStatus = Literal["pending", "clean", "infected"]


class EvidenceInput(TypedDict, total=False):
    id: str
    url: str | None
    fileId: str | None
    fileScanStatus: FileScanStatus | None
    stance: Stance
    trust: int


class FactScoreResult(TypedDict):
    status: FactStatus
    factPct: int | None
    eligibleTrue: int
    eligibleFalse: int
    wTrue: int
    wFalse: int
    gatePassed: bool
    reasons: list[str]
    ruleVersion: str
