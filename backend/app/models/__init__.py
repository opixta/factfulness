import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

FACTFULNESS_NS = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")


def slug_uuid(slug: str) -> uuid.UUID:
    return uuid.uuid5(FACTFULNESS_NS, f"factfulness/{slug}")


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    external_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    nickname_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notify_verdict_change: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String, default="published")
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    participant_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    claims: Mapped[list["Claim"]] = relationship(back_populates="topic")


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    topic_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("topics.id"), index=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    topic: Mapped[Topic] = relationship(back_populates="claims")
    score: Mapped["ClaimScore | None"] = relationship(back_populates="claim", uselist=False)


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("claim_id", "user_id"),)

    claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("claims.id"), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    value: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("claims.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text)
    file_mime: Mapped[str | None] = mapped_column(String)
    file_size: Mapped[int | None] = mapped_column(Integer)
    scan_status: Mapped[str | None] = mapped_column(String)
    scanned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    quarantine_file_key: Mapped[str | None] = mapped_column(Text)
    file_key: Mapped[str | None] = mapped_column(Text)
    stance: Mapped[str] = mapped_column(String, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, default="active")
    archive_url: Mapped[str | None] = mapped_column(Text)
    archive_status: Mapped[str | None] = mapped_column(String)
    og_title: Mapped[str | None] = mapped_column(Text)
    og_site_name: Mapped[str | None] = mapped_column(Text)
    og_image_url: Mapped[str | None] = mapped_column(Text)
    preview_status: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    trust_rows: Mapped[list["EvidenceTrust"]] = relationship(back_populates="evidence")


class EvidenceTrust(Base):
    __tablename__ = "evidence_trust"

    evidence_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("evidence.id"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    evidence: Mapped[Evidence] = relationship(back_populates="trust_rows")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("claims.id"), index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text, nullable=False)
    linked_vote: Mapped[bool | None] = mapped_column(Boolean)
    hidden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ClaimScore(Base):
    __tablename__ = "claim_scores"

    claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("claims.id"), primary_key=True)
    opinion_pct: Mapped[int] = mapped_column(Integer, default=0)
    votes_true: Mapped[int] = mapped_column(Integer, default=0)
    votes_false: Mapped[int] = mapped_column(Integer, default=0)
    fact_status: Mapped[str] = mapped_column(String, default="pending")
    fact_pct: Mapped[int | None] = mapped_column(Integer)
    w_true: Mapped[int] = mapped_column(Integer, default=0)
    w_false: Mapped[int] = mapped_column(Integer, default=0)
    eligible_true: Mapped[int] = mapped_column(Integer, default=0)
    eligible_false: Mapped[int] = mapped_column(Integer, default=0)
    gate_reasons: Mapped[list] = mapped_column(JSONB, default=list)
    gate_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    rule_version: Mapped[str] = mapped_column(String, nullable=False)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    claim: Mapped[Claim] = relationship(back_populates="score")


class ClaimScoreHistory(Base):
    __tablename__ = "claim_score_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("claims.id"), index=True)
    opinion_pct: Mapped[int] = mapped_column(Integer)
    votes_true: Mapped[int] = mapped_column(Integer)
    votes_false: Mapped[int] = mapped_column(Integer)
    fact_status: Mapped[str] = mapped_column(String)
    fact_pct: Mapped[int | None] = mapped_column(Integer)
    w_true: Mapped[int] = mapped_column(Integer)
    w_false: Mapped[int] = mapped_column(Integer)
    eligible_true: Mapped[int] = mapped_column(Integer)
    eligible_false: Mapped[int] = mapped_column(Integer)
    gate_passed: Mapped[bool] = mapped_column(Boolean)
    gate_reasons: Mapped[list] = mapped_column(JSONB, default=list)
    rule_version: Mapped[str] = mapped_column(String)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ContentReport(Base):
    __tablename__ = "content_reports"
    __table_args__ = (
        UniqueConstraint("target_type", "target_id", "reporter_id", name="content_reports_distinct_reporter_idx"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    target_type: Mapped[str] = mapped_column(String, nullable=False)
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    reporter_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    action: Mapped[str | None] = mapped_column(String)


class PushToken(Base):
    __tablename__ = "push_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    expo_token: Mapped[str] = mapped_column(String, primary_key=True)
    platform: Mapped[str | None] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
