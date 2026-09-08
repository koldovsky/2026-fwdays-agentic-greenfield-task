"""Coach request/response schemas (Pydantic v2), architecture §4.2.

``CoachCard`` is the **server-returned** payload for both ``/api/coach/insight`` and
``/api/coach/chat``: the four §4.2 fields the model produces PLUS a single reserved,
**server-set** boolean ``fallback`` marker present on every payload (``false`` on every
normal card, ``true`` only on the degraded fallback card). The model-facing structured
output is exactly the four fields — the marker is set by the server, so a model can never
forge a fallback (MINOR-1). ``ChatRequest`` defends the prompt/grounding surface: an
empty/whitespace or over-long ``user_message`` is rejected 422 before any model call (M4).
"""

from pydantic import BaseModel, Field, field_validator

# Defensive upper bound on a chat message (~500 tokens by §4.3's len/4). The message is
# concatenated into the prompt and its numbers widen the grounding allowed set, so an
# unbounded message could blow the ~2,000-token history budget or dilute grounding. Rejected,
# not clipped — mirrors slice-004's `_MAX_SESSION_*` defensive caps.
_MAX_MESSAGE_CHARS = 2000


class MetricItem(BaseModel):
    """One observation or recommendation: its text plus the metric blocks it references."""

    text: str
    metric_refs: list[str]


class CoachCard(BaseModel):
    """The §4.2 insight/chat card plus the server-set ``fallback`` marker (FR-COACH-05)."""

    language: str
    quiet: bool
    observations: list[MetricItem]
    recommendations: list[MetricItem]
    fallback: bool


class ChatRequest(BaseModel):
    """A single chat turn. Empty/whitespace or over-long messages are rejected 422 (M4)."""

    user_message: str = Field(min_length=1, max_length=_MAX_MESSAGE_CHARS)

    @field_validator("user_message")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("user_message must not be empty or whitespace only")
        return value
