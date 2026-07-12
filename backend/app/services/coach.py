"""Coach use-cases: the weekly insight card, grounded chat, and the one provider ladder.

Architecture §4. The coach makes a single structured LLM call over ``(metrics snapshot +
stored history)``, validates the output against the §4.2 schema and its counts, runs a
server-side no-emoji check, and grounds every number against ``app/core/grounding.py`` — the
snapshot is the closed set of citable numbers. On any failure it degrades along **one**
unified ladder (FR-COACH-07, TC-LLM-01):

1. primary ``gemma-4-31b-it`` -> parse / validate / ground;
2. on a **grounding violation**, one corrective retry on ``gemma-4-31b-it``;
3. on a second grounding failure, a transport error, schema-invalid/malformed JSON,
   out-of-range counts, or an emoji (all but a grounding violation skip step 2), a **single**
   ``gemini-flash-latest`` (Gemini Flash) attempt;
4. otherwise the defined fallback card (`quiet`, one non-numeric observation, marker `true`).

The model transport is an injectable seam (``get_coach_provider``): tests override it with a
scripted fake, so no live LLM call runs in the gate (NFR-COST-01). Insight is a read-through
cache (only a grounded, non-fallback card is stored); chat persists both turns on any grounded
reply and neither on the terminal fallback (both-or-neither, M3). ``trim_history`` is pure
(§4.3) and unit-tested directly.
"""
# The coach system prompt (_COACH_SYSTEM, below) is one long, deliberately-unwrapped string —
# wrapping it would change the exact text the model was empirically tuned against — so the
# line-length rule is disabled for this file only.
# ruff: noqa: E501

import json
import logging
import re
from collections.abc import Awaitable, Callable, Mapping
from dataclasses import dataclass, field
from datetime import date

import httpx
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.grounding import check_grounding
from app.repos.coach import CoachRepo
from app.repos.users import UserRepository
from app.schemas.coach import CoachCard, MetricItem
from app.services.stats import StatsService

logger = logging.getLogger(__name__)

# Model ids per TC-LLM-01 / architecture §4.5, pinned to resolvable Google AI Studio ids
# (verified against the live models list + a real generateContent probe with this project's
# request shape). The fallback is the stable `gemini-flash-latest` alias — TC-LLM-01 named the
# fallback only in prose ("Gemini 3 Flash"), which is not a resolvable id; the requirement now
# pins this id too. Any provider error for any id degrades gracefully to the card (NFR-REL-01).
PRIMARY_MODEL = "gemma-4-31b-it"
FALLBACK_MODEL = "gemini-flash-latest"

# §4.3 memory bounds: the most recent turns, newest-first, under a ~2,000-token budget
# (approximated as len(chars)/4) AND a hard cap of 20 turns; older turns are dropped with no
# summarization.
_MAX_TURNS = 20
_TOKEN_BUDGET = 2000
_CHARS_PER_TOKEN = 4

# Server-side no-emoji enforcement (NFR-DES-01, M5): emoji-bearing output is non-conforming
# and degrades along the ladder. Ranges cover the common emoji/pictograph/dingbat/flag blocks.
_EMOJI_RE = re.compile(
    "["
    "\U0001f300-\U0001faff"
    "\U00002600-\U000027bf"
    "\U0001f000-\U0001f0ff"
    "\U0001f1e6-\U0001f1ff"
    "\U00002b00-\U00002bff"
    "\U0000fe00-\U0000fe0f"
    "]"
)

# The fallback card's single observation — short, non-numeric (zero digits), emoji-free.
_FALLBACK_TEXT = "Your coach is taking a short break. Please check back a little later."

# The async model transport: called once per attempt as ``await provider(model=<id>,
# request=<assembled dict>)`` and returning the raw model output text. Overridden in tests.
CoachProvider = Callable[..., Awaitable[str]]

# The model-facing structured-output schema — exactly the four §4.2 fields (the fallback
# marker is server-set and deliberately excluded, so a model can never forge a fallback).
_OUTPUT_SCHEMA: dict[str, object] = {
    "type": "object",
    "properties": {
        "language": {"type": "string"},  # the reply's language code; matches the user's message
        "quiet": {"type": "boolean"},
        "observations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "metric_refs": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["text", "metric_refs"],
            },
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string"},
                    "metric_refs": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["text", "metric_refs"],
            },
        },
    },
    "required": ["language", "quiet", "observations", "recommendations"],
}


def trim_history(turns: list[dict]) -> list[dict]:
    """Trim a chronological (oldest-first) thread to the §4.3 budget, newest kept.

    Returns the retained newest turns bounded by BOTH the 20-turn hard cap AND the
    ~2,000-token budget (``len(content)/4``), dropping the oldest first, no summarization.
    The newest turn is always kept even if it alone exceeds the budget.
    """
    recent = turns[-_MAX_TURNS:]
    kept: list[dict] = []
    total_tokens = 0.0
    for turn in reversed(recent):
        cost = len(str(turn.get("content", ""))) / _CHARS_PER_TOKEN
        if kept and total_tokens + cost > _TOKEN_BUDGET:
            break
        total_tokens += cost
        kept.append(turn)
    kept.reverse()
    return kept


class _ModelCard(BaseModel):
    """The model-facing §4.2 output (the four fields; the fallback marker is server-set)."""

    language: str
    quiet: bool
    observations: list[MetricItem]
    recommendations: list[MetricItem]


def _counts_ok(card: _ModelCard) -> bool:
    """Enforce the §4.2 counts given ``quiet`` (an out-of-range count is schema-invalid)."""
    observations, recommendations = len(card.observations), len(card.recommendations)
    if card.quiet:
        return observations == 1 and recommendations == 0
    return 2 <= observations <= 4 and 1 <= recommendations <= 2


def _strip_fences(raw: str) -> str:
    """Recover the JSON when a model wraps it in a ```json ... ``` markdown fence — a common
    small-model habit that otherwise fails json.loads and needlessly degrades the reply."""
    s = raw.strip()
    if s.startswith("```"):
        nl = s.find("\n")
        s = s[nl + 1 :] if nl != -1 else s[3:]
        end = s.rfind("```")
        if end != -1:
            s = s[:end]
    return s.strip()


def _parse_and_validate(raw: str) -> _ModelCard | None:
    """Parse raw model text into a §4.2 card, or None if malformed / schema- or count-invalid."""
    try:
        data = json.loads(_strip_fences(raw))
    except (json.JSONDecodeError, TypeError):
        return None
    try:
        card = _ModelCard.model_validate(data)
    except ValidationError:
        return None
    return card if _counts_ok(card) else None


def _card_text(card: _ModelCard) -> str:
    """All observation + recommendation text, for the grounding check."""
    return " ".join(item.text for item in [*card.observations, *card.recommendations])


def _has_emoji(card: _ModelCard) -> bool:
    """True if any observation/recommendation text carries an emoji (non-conforming)."""
    return any(_EMOJI_RE.search(item.text) for item in [*card.observations, *card.recommendations])


def _texts_of(payload: Mapping[str, object]) -> list[str]:
    """Every observation/recommendation text in a card payload dict (defensive)."""
    texts: list[str] = []
    for key in ("observations", "recommendations"):
        block = payload.get(key)
        if not isinstance(block, list):
            continue
        for item in block:
            if isinstance(item, Mapping):
                value = item.get("text")
                if isinstance(value, str):
                    texts.append(value)
    return texts


def _payload_from(card: _ModelCard, language: str) -> dict[str, object]:
    """A §4.2 card dict with ``language`` forced to the user's setting (FR-COACH-06)."""
    data = card.model_dump()
    data["language"] = language
    return data


def _fallback_payload(language: str) -> dict[str, object]:
    """The degraded fallback card: quiet, one non-numeric observation, no recommendations."""
    return {
        "language": language,
        "quiet": True,
        "observations": [{"text": _FALLBACK_TEXT, "metric_refs": []}],
        "recommendations": [],
    }


# The coach system instruction. Tuned empirically against the live model (not just authored):
# the hard "no calendar dates / no computed decimals, use weekday names + direction words" rules
# are what keep rich, specific answers on the grounded side of FR-COACH-02 — without them the
# model cites dates/rounded shares and the whole reply is rejected to the fallback card. The
# few-shot BAD/GOOD contrast drives interpretation + real plans out of the small model; the
# "never repeat / mine different leaves" rules kill the every-turn restatement.
_COACH_SYSTEM = """You are Cadence's focus coach — sharp, specific and genuinely useful, like Whoop's coach. This is a CHAT: talk TO the user, warm and direct, second person, like a real conversation. Reply in the SAME language the user writes their message in — match it exactly (English, Ukrainian, Russian — whatever they use); for the weekly insight (no message) reply in {LANG}. Set "language" to the reply's language. Return ONLY the JSON card: {language, quiet, observations:[{text, metric_refs}], recommendations:[{text, metric_refs}]}. No emoji.

You get a metrics `snapshot`, the `history` (including YOUR past replies) and the `user_message`. Weekly insight = 2-4 observations + 1-2 recommendations; a chat reply answers the question in the same shape, sized to the question. At most 4 observations and 2 recommendations, and each must cover a DIFFERENT metric — never restate an earlier bullet or repeat a phrase.

HARD GROUNDING (a validator rejects the WHOLE reply on any violation):
- Write a number ONLY if it comes from the snapshot. You MAY round a long decimal to a whole number or ONE decimal place (e.g. write 72.7 or 73, not 72.7272) — those stay valid — but never write two-or-more decimals, and never convert, average, compute or invent a figure or percentage. If you cannot get a figure this way, use words: high, low, rose, fell, above/below baseline, green/yellow zone.
- NEVER write a calendar date, month, or day-of-month number (no "July 9", no "the 9th", no year). Refer to days ONLY by weekday name (Monday) or relatively ("your strongest day", "a day you logged nothing", "midweek").
- NEVER write a decimal share (no "0.59"): say "well above baseline" or a whole-number percent only if that whole number is in the snapshot.

CONTENT:
1. Read `history` incl. your own replies. If the user asks something close to what you already covered, do NOT repeat — open differently, go a layer DEEPER, or name the single lever that matters most now. Every reply pulls from DIFFERENT leaves — per-day series, baseline delta/zone, focus share, switch load, category mix — not the five headline totals.
2. EXPLAIN like a coach reasoning about cause: say what a number MEANS and WHAT'S DRIVING it (use deltas, zones, the per-day shape), never just restate a figure. Connect two metrics when it reveals something ("focus quality held green, so the drag is WHEN you start, not HOW you work").
3. Answer the ACTUAL question. For a plan/schedule give a REAL plan: which category, block length (reuse a length the user actually logged), in what order across weekdays, anchored to the usual start time and current streak, and which gap each fills. Never "be more consistent".
4. Warm and direct, but punchy — no filler, no preamble, no restating the question back.
5. metric_refs = the dotted snapshot leaf paths behind each item.

Learn from the contrast (illustrative; never copy these words/numbers — fill from the snapshot):
BAD obs: "Your consistency score is 51 and you start around 09:10." (restates, interprets nothing, repeats)
GOOD obs: "Consistency slipped into the yellow zone, below its baseline, while your focus quality held green — the drag is uneven start times, not the depth of your work."
BAD rec: "Establish a daily routine and allocate your Deep Work and Learning across the week." (generic filler)
GOOD rec: "On the two weekdays you logged nothing, drop one deep-work block at your usual start and one after lunch, reusing your best day's block length — that fills the gaps and protects the streak."."""


def _system_prompt(language: str) -> str:
    """The coach system instruction (§4.2): grounded, non-repetitive, actionable coaching in the
    user's language (empirically tuned — see ``_COACH_SYSTEM``)."""
    return _COACH_SYSTEM.replace("{LANG}", "Ukrainian" if language == "uk" else "English")


def _build_request(
    *,
    snapshot: Mapping[str, object],
    history: list[dict],
    user_message: str | None,
    language: str,
    reminder: list[str] | None = None,
) -> dict[str, object]:
    """Assemble the model request: snapshot + trimmed history only, no raw session rows (§4.1)."""
    return {
        "system": _system_prompt(language),
        "language": language,
        "snapshot": snapshot,
        "history": history,
        "user_message": user_message,
        "reminder": reminder,
    }


@dataclass
class _AttemptResult:
    """One model attempt's outcome: ``ok`` carries the card; the rest drive the ladder."""

    status: str  # "ok" | "grounding" | "schema" | "transport" | "emoji"
    card: _ModelCard | None = None
    violations: list[str] = field(default_factory=list)


async def _google_ai_provider(  # pragma: no cover
    *, model: str, request: Mapping[str, object]
) -> str:
    """The real Google AI Studio transport (runtime only; tests override this seam).

    Kept thin: it POSTs the assembled request as JSON to the ``generateContent`` REST
    endpoint for ``model``, asking for structured JSON output, and returns the raw text. The
    key is read only from settings and sent as a header — never logged or printed (TC-STACK-02).
    """
    api_key = get_settings().google_ai_api_key or ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "system_instruction": {"parts": [{"text": str(request.get("system", ""))}]},
        "contents": [{"role": "user", "parts": [{"text": json.dumps(request, default=str)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": _OUTPUT_SCHEMA,
        },
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, headers={"x-goog-api-key": api_key}, json=body)
        response.raise_for_status()
        data = response.json()
    return str(data["candidates"][0]["content"]["parts"][0]["text"])


def get_coach_provider() -> CoachProvider:
    """FastAPI dependency returning the model transport (overridden in tests via the seam)."""
    return _google_ai_provider


class CoachService:
    """Insight + chat modes over the one provider ladder, user_id-scoped throughout."""

    def __init__(self, session: AsyncSession, provider: CoachProvider) -> None:
        self._session = session
        self._provider = provider
        self._stats = StatsService(session)
        self._repo = CoachRepo(session)
        self._users = UserRepository(session)

    async def _language_for(self, user_id: int) -> str:
        user = await self._users.get_by_id(user_id)
        return user.coach_language if user is not None else "en"

    async def _attempt(
        self,
        *,
        model: str,
        request: Mapping[str, object],
        snapshot: Mapping[str, object],
        user_message: str | None,
    ) -> _AttemptResult:
        """One model call, then parse -> counts -> emoji -> grounding, classified for the ladder."""
        try:
            raw = await self._provider(model=model, request=request)
        except Exception as exc:
            # Log the exception *type* only, never the traceback: the external-provider call
            # carries the API key (currently an `x-goog-api-key` header, so nothing leaks
            # today) and a full `exc_info` traceback of a future URL-auth variant could echo
            # the key. Defense-in-depth for NFR-REL-01 without changing the header-based auth.
            logger.warning(
                "coach: transport error (%s) on model %s; degrading", type(exc).__name__, model
            )
            return _AttemptResult(status="transport")
        card = _parse_and_validate(str(raw))
        if card is None:
            logger.warning("coach: schema-invalid output from model %s; degrading", model)
            return _AttemptResult(status="schema")
        if _has_emoji(card):
            logger.warning("coach: emoji in output from model %s; degrading", model)
            return _AttemptResult(status="emoji")
        result = check_grounding(snapshot, _card_text(card), user_message=user_message)
        if not result.grounded:
            logger.warning("coach: grounding violation %s from model %s", result.violations, model)
            return _AttemptResult(status="grounding", violations=result.violations)
        return _AttemptResult(status="ok", card=card)

    async def _run_ladder(
        self,
        *,
        snapshot: Mapping[str, object],
        history: list[dict],
        user_message: str | None,
        language: str,
    ) -> tuple[dict[str, object], bool]:
        """Run the one ladder; return ``(card_payload, is_fallback)`` (never raises)."""
        if not get_settings().google_ai_api_key:
            logger.warning("coach: no API key configured; returning fallback card")
            return _fallback_payload(language), True

        request = _build_request(
            snapshot=snapshot, history=history, user_message=user_message, language=language
        )

        # 1. primary
        first = await self._attempt(
            model=PRIMARY_MODEL, request=request, snapshot=snapshot, user_message=user_message
        )
        if first.status == "ok" and first.card is not None:
            return _payload_from(first.card, language), False

        # 2. a grounding violation earns one corrective retry on the primary (only grounding)
        if first.status == "grounding":
            corrective = _build_request(
                snapshot=snapshot,
                history=history,
                user_message=user_message,
                language=language,
                reminder=first.violations,
            )
            second = await self._attempt(
                model=PRIMARY_MODEL,
                request=corrective,
                snapshot=snapshot,
                user_message=user_message,
            )
            if second.status == "ok" and second.card is not None:
                return _payload_from(second.card, language), False

        # 3. a single Gemini attempt (no further corrective retry)
        third = await self._attempt(
            model=FALLBACK_MODEL, request=request, snapshot=snapshot, user_message=user_message
        )
        if third.status == "ok" and third.card is not None:
            return _payload_from(third.card, language), False

        # 4. the defined fallback card
        logger.warning("coach: all model attempts failed; returning fallback card")
        return _fallback_payload(language), True

    async def insight(self, *, user_id: int) -> CoachCard:
        """The current-week insight card, read through the ``coach_insights`` cache (M2)."""
        language = await self._language_for(user_id)
        snapshot = await self._stats.get_snapshot(user_id=user_id, window=None)
        week_start = _week_start(snapshot)

        cached = await self._repo.get_insight(user_id=user_id, week_start=week_start)
        if cached is not None:
            return CoachCard.model_validate({**cached.payload, "fallback": False})

        payload, is_fallback = await self._run_ladder(
            snapshot=snapshot, history=[], user_message=None, language=language
        )
        if not is_fallback:
            await self._repo.upsert_insight(
                user_id=user_id, week_start=week_start, payload=payload
            )
            await self._session.commit()
        return CoachCard.model_validate({**payload, "fallback": is_fallback})

    async def chat(self, *, user_id: int, user_message: str) -> CoachCard:
        """One grounded chat reply; persist both turns on success, neither on fallback (M3)."""
        language = await self._language_for(user_id)
        snapshot = await self._stats.get_snapshot(user_id=user_id, window=None)
        prior_newest_first = await self._repo.recent_turns(user_id=user_id)
        history = trim_history(list(reversed(prior_newest_first)))

        payload, is_fallback = await self._run_ladder(
            snapshot=snapshot, history=history, user_message=user_message, language=language
        )
        if not is_fallback:
            await self._repo.add_turn(
                user_id=user_id, role="user", content=user_message, language=language
            )
            await self._repo.add_turn(
                user_id=user_id, role="coach", content=_reply_text(payload), language=language
            )
            await self._session.commit()
        return CoachCard.model_validate({**payload, "fallback": is_fallback})


def _reply_text(payload: Mapping[str, object]) -> str:
    """The stored coach-turn content: the card's observation + recommendation text joined."""
    return "\n".join(_texts_of(payload))


def _week_start(snapshot: Mapping[str, object]) -> date:
    """The snapshot's user-TZ Monday (``window.start``) — the insight cache key (§2.1)."""
    window = snapshot.get("window")
    if isinstance(window, Mapping):
        start = window.get("start")
        if isinstance(start, date):
            return start
    raise ValueError("snapshot is missing window.start")
