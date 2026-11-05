"""Expo Push API sender with test fake."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Protocol

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PushMessage:
    to: str
    title: str
    body: str
    data: dict[str, Any]


@dataclass
class PushTicket:
    status: str
    details: dict[str, Any] | None = None


@dataclass
class FakePushSender:
    sent: list[PushMessage] = field(default_factory=list)
    responses: list[PushTicket] = field(default_factory=list)

    def send(self, messages: list[PushMessage]) -> list[PushTicket]:
        self.sent.extend(messages)
        if self.responses:
            return self.responses[: len(messages)]
        return [PushTicket(status="ok") for _ in messages]


class PushSender(Protocol):
    def send(self, messages: list[PushMessage]) -> list[PushTicket]: ...


class ExpoPushSender:
    def __init__(self, url: str | None = None) -> None:
        self.url = url or settings.expo_push_url

    def send(self, messages: list[PushMessage]) -> list[PushTicket]:
        if not messages:
            return []
        payload = [
            {
                "to": m.to,
                "title": m.title,
                "body": m.body,
                "data": m.data,
                "sound": "default",
            }
            for m in messages
        ]
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(self.url, json=payload)
                res.raise_for_status()
                body = res.json()
        except Exception as exc:
            logger.warning("Expo push send failed: %s", exc)
            return [PushTicket(status="error", details={"error": str(exc)}) for _ in messages]

        tickets: list[PushTicket] = []
        data = body.get("data") if isinstance(body, dict) else body
        if not isinstance(data, list):
            return [PushTicket(status="error") for _ in messages]
        for item in data:
            if not isinstance(item, dict):
                tickets.append(PushTicket(status="error"))
                continue
            tickets.append(
                PushTicket(
                    status=str(item.get("status", "error")),
                    details=item.get("details") if isinstance(item.get("details"), dict) else None,
                )
            )
        return tickets


_fake_sender = FakePushSender()


def get_push_sender() -> PushSender:
    if settings.push_sender == "expo":
        return ExpoPushSender()
    return _fake_sender


def get_fake_push_sender() -> FakePushSender:
    return _fake_sender
