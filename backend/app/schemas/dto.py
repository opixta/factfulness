from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ScoringConfigOut(BaseModel):
    trustMin: int
    minEligibleSameDir: int
    factThreshold: float
    ruleVersion: str


class FactDto(BaseModel):
    status: str
    factPct: int | None
    wTrue: int
    wFalse: int
    eligibleTrue: int
    eligibleFalse: int
    gatePassed: bool
    reasons: list[str]
    ruleVersion: str


class ClaimScoresDto(BaseModel):
    opinionPct: int
    votesTrue: int
    votesFalse: int
    userVote: str | None = None
    fact: FactDto


class TopicListItem(BaseModel):
    id: UUID
    title: str
    summary: str
    tags: list[str]
    participants: int
    updatedAt: datetime
    claimCount: int
    settledCount: int


class ClaimSummary(BaseModel):
    id: UUID
    text: str
    scores: ClaimScoresDto


class TopicDetailOut(BaseModel):
    topic: TopicListItem
    claims: list[ClaimSummary]


class EvidenceDto(BaseModel):
    id: UUID
    title: str
    url: str
    stance: str
    summary: str
    trust: int
    ogTitle: str | None = None
    ogSiteName: str | None = None
    ogImageUrl: str | None = None
    previewStatus: str | None = None
    archiveUrl: str | None = None
    archiveStatus: str | None = None


class CommentDto(BaseModel):
    id: UUID
    author: str
    body: str
    vote: str | None = None
    at: datetime


class ClaimDetailOut(BaseModel):
    topicId: UUID
    claim: ClaimSummary
    evidence: list[EvidenceDto]
    comments: list[CommentDto]


class ProposeTopicIn(BaseModel):
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    firstClaimText: str = Field(min_length=1)


class ProposeClaimIn(BaseModel):
    text: str = Field(min_length=1)
    reason: str | None = None


class VoteIn(BaseModel):
    value: str


class EvidenceIn(BaseModel):
    title: str
    url: str = ""
    stance: str
    summary: str


class CommentIn(BaseModel):
    body: str
    vote: str = ""
