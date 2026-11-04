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
    reason: str | None = None
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
    fileMime: str | None = None
    fileSize: int | None = None
    fileName: str | None = None
    scanStatus: str | None = None
    status: str = "active"
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


class FileEvidenceUploadIn(BaseModel):
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    stance: str
    fileName: str = Field(min_length=1)
    fileMime: str
    fileSize: int = Field(gt=0)


class CommentIn(BaseModel):
    body: str
    vote: str = ""


class SearchHitOut(BaseModel):
    type: str
    topicId: UUID
    claimId: UUID | None = None
    title: str
    snippet: str | None = None


class ContentReportIn(BaseModel):
    targetType: str
    targetId: UUID
    reason: str | None = None


class NotificationPrefsOut(BaseModel):
    notifyVerdictChange: bool


class NotificationPrefsIn(BaseModel):
    notifyVerdictChange: bool


class PushTokenIn(BaseModel):
    expoToken: str
    platform: str | None = None


class UserProfileIn(BaseModel):
    displayName: str = Field(min_length=2, max_length=20)


class UserProfileOut(BaseModel):
    externalId: str
    displayName: str
