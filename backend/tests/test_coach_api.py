"""DB-backed acceptance tests for the coach endpoints (spec 006).

Covers FR-COACH-01 (weekly insight + read-through cache), FR-COACH-03 (grounded chat +
per-user memory + input validation), FR-COACH-04 (assembly: snapshot + history only, real
snapshot artifact), FR-COACH-05 (fixed §4.2 output shape + server-set fallback marker +
no emoji), FR-COACH-06 (reply language), and FR-COACH-07 (the one provider/degradation
ladder). DB-touching and gated behind ``RUN_DB_TESTS=1`` like the other slice test files.

**No live LLM call anywhere (NFR-COST-01).** The coach's model transport is an injectable
provider seam; every test overrides it with a deterministic ``ScriptedProvider`` and asserts
the ladder / persistence / degradation from a scripted sequence of raw model outputs.

Seam contract this file pins (nothing coach-side exists yet, so each test is RED at
``ModuleNotFoundError`` on ``_load_coach()`` or the route's ``404``, and turns GREEN once the
implementer conforms):

    Routes (both take ``CurrentUser`` + reused ``require_csrf``):
        POST /api/coach/insight        -> current-week card (read-through coach_insights cache)
        POST /api/coach/chat  {"user_message": str}  -> one grounded reply

    Response payload = the four §4.2 fields
        {"language": "en"|"uk", "quiet": bool,
         "observations":     [{"text": str, "metric_refs": [str]}],
         "recommendations":  [{"text": str, "metric_refs": [str]}]}
      PLUS a single reserved, server-set boolean ``fallback`` marker present on EVERY payload
      (``false`` on every normal card, ``true`` only on the degraded fallback card). The
      model-facing structured-output schema is exactly the four fields (the marker is
      server-set, so a model can never forge a fallback). Fallback HTTP status is ``200`` --
      the card is a renderable payload; the marker's value, not the status, distinguishes it.

    Provider seam:
        app.services.coach.get_coach_provider  -- a FastAPI dependency returning an async
            callable invoked once per model attempt as ``await provider(model=<id>, request=…)``
            and returning the RAW model output text (str). The coach service parses that text,
            enforces the §4.2 schema + counts, runs the no-emoji check, and grounds it
            (app/core/grounding.py); malformed / schema-invalid / emoji-bearing /
            grounding-violating outputs drive the ladder below. Overridden here via
            ``app.dependency_overrides`` -> ``ScriptedProvider``.

    Model ids (TC-LLM-01, verbatim -- a "corrected" id would be drift):
        primary ``gemma-4-31b-it`` -> on a grounding violation, ONE corrective retry on
        ``gemma-4-31b-it`` -> on a second grounding failure / transport error / schema-invalid
        JSON, a SINGLE ``Gemini 3 Flash`` attempt -> then the defined fallback card.

    API key: the coach reads ``settings.google_ai_api_key`` ONLY (TC-STACK-02); when it is
        empty the coach returns the fallback card WITHOUT calling the provider (NFR-REL-01).
        An autouse fixture sets a dummy key so the provider-exercising tests reach the fake.

Every account uses the ``@coach006.local`` domain; a per-file autouse fixture deletes those
users (and their coach_messages / coach_insights rows) after each test -- scoped to this
domain so parallel slices are unaffected, and tolerant of the coach tables not existing yet.
Coach-module imports live inside ``_load_coach()`` for a clean per-test RED reason.
"""

import json
import os
import re
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text

from app.config import get_settings
from app.db import get_sessionmaker
from app.main import app

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="requires Postgres; run `docker compose up -d db` and set RUN_DB_TESTS=1",
)

TEST_DOMAIN = "@coach006.local"
PASSWORD = "correct horse battery"  # >= 8 chars
SETTINGS = get_settings()
COLOR_A = "#3B82F6"

PRIMARY_MODEL = "gemma-4-31b-it"
FALLBACK_MODEL = "gemini-flash-latest"

# Constructed from a codepoint (not a literal glyph) so the source carries no emoji.
_ROCKET = "\U0001f680"
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


# --- provider fake + scripted outputs -----------------------------------------


class _ProviderBoom(Exception):
    """A simulated provider/transport error (e.g. the model id was rejected)."""


class ScriptedProvider:
    """A stand-in for the LLM transport: returns a scripted raw output per call.

    Each call records ``(args, kwargs)`` so a test can assert how many model attempts ran,
    which model ids were used, and what was serialized into the request. A scripted
    ``Exception`` is raised (a transport error); a scripted ``str`` is returned (raw model
    text). Running past the script raises -- an unexpected extra model call fails the test.
    """

    def __init__(self, script: list[object]) -> None:
        self._script = list(script)
        self.calls: list[tuple[tuple[object, ...], dict[str, object]]] = []

    async def __call__(self, *args: object, **kwargs: object) -> object:
        self.calls.append((args, kwargs))
        if not self._script:
            raise AssertionError(f"provider called more than scripted ({len(self.calls)})")
        step = self._script.pop(0)
        if isinstance(step, BaseException):
            raise step
        return step

    @property
    def call_count(self) -> int:
        return len(self.calls)

    def models(self) -> list[object]:
        out: list[object] = []
        for args, kwargs in self.calls:
            model = kwargs.get("model")
            if model is None and args:
                model = args[0]
            out.append(model)
        return out

    def serialized(self) -> str:
        return "\n".join(json.dumps({"a": a, "k": k}, default=str) for a, k in self.calls)


def _card_json(
    *,
    observations: list[str],
    recommendations: list[str],
    quiet: bool = False,
    language: str = "en",
) -> str:
    """Serialize a §4.2-shaped model output (the four model-facing fields only)."""
    return json.dumps(
        {
            "language": language,
            "quiet": quiet,
            "observations": [{"text": t, "metric_refs": []} for t in observations],
            "recommendations": [{"text": t, "metric_refs": []} for t in recommendations],
        }
    )


# A grounded, number-free notable card (2-4 observations + 1-2 recommendations).
NOTABLE = _card_json(
    observations=[
        "You showed up on most days this week.",
        "Your deep focus held steady.",
        "Mornings were your strongest stretch.",
    ],
    recommendations=[
        "Protect one morning block for deep work.",
        "Keep the momentum going tomorrow.",
    ],
)
# A grounded quiet card (exactly one observation, no recommendation).
QUIET = _card_json(
    observations=["A calm, steady week with little to flag."],
    recommendations=[],
    quiet=True,
)
# A grounded chat reply (number-free -> always grounded against any snapshot).
GROUNDED = _card_json(
    observations=["You stayed consistent this week.", "Your focus was steady."],
    recommendations=["Keep your protected morning block."],
)
# Valid counts, but cites a fabricated out-of-snapshot number -> grounding violation.
VIOLATING = _card_json(
    observations=["You logged 180 min more than usual.", "Focus stayed strong."],
    recommendations=["Ease off a little next week."],
)
# Valid counts, but the text carries an emoji -> non-conforming (NFR-DES-01).
EMOJI = _card_json(
    observations=[f"Great work this week {_ROCKET}", "You kept your rhythm."],
    recommendations=["Keep it up."],
)
# quiet=False with FIVE observations -> outside the 2-4 bound -> schema-invalid.
OUT_OF_RANGE = _card_json(
    observations=["one", "two", "three", "four", "five"],
    recommendations=["only one"],
)
# Not valid JSON at all -> schema-invalid / malformed.
MALFORMED = "this is not json {"


# --- helpers (own copies; do not touch shared infra) --------------------------


def unique_email() -> str:
    return f"user-{uuid.uuid4().hex}{TEST_DOMAIN}"


def make_client() -> AsyncClient:
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def _csrf(token: str) -> dict[str, str]:
    return {SETTINGS.csrf_header_name: token}


def _load_coach() -> object:
    """Return the ``get_coach_provider`` dependency. Raises ``ModuleNotFoundError`` at RED."""
    from app.services.coach import get_coach_provider

    return get_coach_provider


async def register_and_login(client: AsyncClient, email: str) -> str:
    reg = await client.post("/api/auth/register", json={"email": email, "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    login = await client.post("/api/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    return str(login.json()["csrf_token"])


async def _create_category(client: AsyncClient, csrf: str, name: str) -> dict[str, object]:
    resp = await client.post(
        "/api/categories", json={"name": name, "color": COLOR_A}, headers=_csrf(csrf)
    )
    assert resp.status_code == 201, resp.text
    body: dict[str, object] = resp.json()
    return body


async def _add_session_ending_now(
    client: AsyncClient, csrf: str, category_id: object, minutes: int
) -> None:
    now = datetime.now(timezone.utc)
    payload = {
        "category_id": category_id,
        "started_at": (now - timedelta(minutes=minutes)).isoformat(),
        "ended_at": now.isoformat(),
        "pauses": [],
    }
    resp = await client.post("/api/sessions", json=payload, headers=_csrf(csrf))
    assert resp.status_code == 201, resp.text


async def _seed_user_with_session(client: AsyncClient, minutes: int = 60) -> tuple[str, str]:
    """Register+login a fresh user and save one ``minutes``-long session; return (email, csrf)."""
    email = unique_email()
    csrf = await register_and_login(client, email)
    cat = await _create_category(client, csrf, "Deep Work")
    await _add_session_ending_now(client, csrf, cat["id"], minutes)
    return email, csrf


async def _sql_one(query: str, params: dict[str, object]) -> object:
    async with get_sessionmaker()() as session:
        row = (await session.execute(text(query), params)).first()
    return None if row is None else row[0]


async def _sql_col(query: str, params: dict[str, object]) -> list[object]:
    async with get_sessionmaker()() as session:
        rows = (await session.execute(text(query), params)).all()
    return [r[0] for r in rows]


async def _user_id(email: str) -> int:
    uid = await _sql_one("SELECT id FROM users WHERE email = :e", {"e": email})
    assert uid is not None
    return int(uid)


async def _coach_message_count(user_id: int) -> int:
    n = await _sql_one("SELECT count(*) FROM coach_messages WHERE user_id = :u", {"u": user_id})
    return int(n or 0)


async def _coach_message_contents(user_id: int) -> list[str]:
    rows = await _sql_col(
        "SELECT content FROM coach_messages WHERE user_id = :u ORDER BY created_at", {"u": user_id}
    )
    return [str(r) for r in rows]


async def _cached_week_starts(user_id: int) -> list[str]:
    rows = await _sql_col(
        "SELECT week_start FROM coach_insights WHERE user_id = :u", {"u": user_id}
    )
    return [str(r) for r in rows]


async def _set_coach_language(email: str, language: str) -> None:
    async with get_sessionmaker()() as session:
        await session.execute(
            text("UPDATE users SET coach_language = :l WHERE email = :e"),
            {"l": language, "e": email},
        )
        await session.commit()


def _assert_card_shape(payload: dict[str, object]) -> None:
    """Assert the payload is the §4.2 structure plus the server-set ``fallback`` marker."""
    assert payload["language"] in ("en", "uk")
    assert isinstance(payload["quiet"], bool)
    for key in ("observations", "recommendations"):
        items = payload[key]
        assert isinstance(items, list)
        for item in items:
            assert isinstance(item["text"], str)
            assert isinstance(item["metric_refs"], list)
            assert all(isinstance(ref, str) for ref in item["metric_refs"])
    assert isinstance(payload["fallback"], bool)  # reserved, server-set, present on every payload


def _all_text(payload: dict[str, object]) -> list[str]:
    texts: list[str] = []
    for key in ("observations", "recommendations"):
        for item in payload.get(key, []):  # type: ignore[union-attr]
            texts.append(str(item.get("text", "")))
    return texts


# --- fixtures -----------------------------------------------------------------


@pytest.fixture(autouse=True)
def _coach_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Give the coach a non-empty key by default so provider-exercising tests reach the fake."""
    monkeypatch.setattr(get_settings(), "google_ai_api_key", "test-dummy-key")


@pytest.fixture(autouse=True)
def _clear_overrides() -> AsyncIterator[None]:
    yield
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
async def _cleanup_test_users() -> AsyncIterator[None]:
    yield
    async with get_sessionmaker()() as session:
        for table in ("coach_messages", "coach_insights"):
            try:
                await session.execute(
                    text(
                        f"DELETE FROM {table} WHERE user_id IN "
                        "(SELECT id FROM users WHERE email LIKE :pat)"
                    ),
                    {"pat": f"%{TEST_DOMAIN}"},
                )
                await session.commit()
            except Exception:
                await session.rollback()  # coach tables may not exist yet (RED)
        await session.execute(
            text("DELETE FROM users WHERE email LIKE :pat"), {"pat": f"%{TEST_DOMAIN}"}
        )
        await session.commit()


def _override_provider(provider: ScriptedProvider) -> None:
    app.dependency_overrides[_load_coach()] = lambda: provider


# --- FR-COACH-01: weekly insight card + read-through cache --------------------


async def test_notable_insight_has_valid_counts_and_is_cached(client: AsyncClient) -> None:
    """A notable insight is a §4.2 card with 2-4 observations / 1-2 recommendations, cached.

    @trace FR-COACH-01
    """
    provider = ScriptedProvider([NOTABLE])
    _override_provider(provider)
    email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["quiet"] is False
    assert payload["fallback"] is False
    assert 2 <= len(payload["observations"]) <= 4
    assert 1 <= len(payload["recommendations"]) <= 2

    snapshot = (await client.get("/api/stats/snapshot")).json()
    week_starts = await _cached_week_starts(await _user_id(email))
    assert week_starts == [str(snapshot["window"]["start"])]


async def test_cached_insight_is_returned_same_week_without_a_second_llm_call(
    client: AsyncClient,
) -> None:
    """A second same-week insight POST is served from cache with no LLM call (NFR-COST-01).

    @trace FR-COACH-01
    """
    provider = ScriptedProvider([NOTABLE])  # exactly one output: a regenerate would exhaust it
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    first = await client.post("/api/coach/insight", headers=_csrf(csrf))
    second = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert provider.call_count == 1  # the cache hit made no second model call
    assert first.json() == second.json()


async def test_quiet_insight_has_one_observation_and_no_recommendation(
    client: AsyncClient,
) -> None:
    """When nothing warrants advice the card is quiet: one observation, no recommendation.

    @trace FR-COACH-01
    """
    provider = ScriptedProvider([QUIET])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["quiet"] is True
    assert len(payload["observations"]) == 1
    assert payload["recommendations"] == []
    assert payload["fallback"] is False  # a normal quiet card, distinguishable from the fallback


async def test_out_of_range_counts_are_treated_as_schema_invalid_and_degrade(
    client: AsyncClient,
) -> None:
    """A quiet=False card with 5 observations is schema-invalid and routed into the ladder.

    @trace FR-COACH-01
    """
    provider = ScriptedProvider([OUT_OF_RANGE, OUT_OF_RANGE])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["fallback"] is True  # degraded, never shown as the 5-observation card
    assert len(payload["observations"]) == 1


async def test_degraded_insight_is_not_cached_and_next_same_week_request_reattempts(
    client: AsyncClient,
) -> None:
    """A fallback insight is returned but not cached; the next same-week request re-attempts.

    @trace FR-COACH-01
    """
    provider = ScriptedProvider([MALFORMED, MALFORMED, NOTABLE])
    _override_provider(provider)
    email, csrf = await _seed_user_with_session(client)

    degraded = await client.post("/api/coach/insight", headers=_csrf(csrf))
    assert degraded.status_code == 200, degraded.text
    assert degraded.json()["fallback"] is True
    assert await _cached_week_starts(await _user_id(email)) == []  # fallback not cached

    healed = await client.post("/api/coach/insight", headers=_csrf(csrf))
    assert healed.status_code == 200, healed.text
    assert healed.json()["fallback"] is False  # re-attempted, not a cached fallback
    assert provider.call_count == 3  # 2 failed attempts + 1 successful re-attempt
    assert len(await _cached_week_starts(await _user_id(email))) == 1


async def test_empty_week_insight_is_a_graceful_card(client: AsyncClient) -> None:
    """A user with no saved sessions (empty snapshot, E-1) still gets a valid §4.2 card.

    @trace FR-COACH-01
    """
    provider = ScriptedProvider([QUIET])
    _override_provider(provider)
    email = unique_email()
    csrf = await register_and_login(client, email)  # no sessions -> all-zero snapshot

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["fallback"] is False  # a genuine (grounded) card, not a crash


# --- FR-COACH-03: grounded chat + per-user memory + input validation ---------


async def test_grounded_chat_reply_persists_both_turns(client: AsyncClient) -> None:
    """A grounded chat reply appends both the user turn and the coach turn to the thread.

    @trace FR-COACH-03
    """
    provider = ScriptedProvider([GROUNDED])
    _override_provider(provider)
    email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    _assert_card_shape(resp.json())
    assert await _coach_message_count(await _user_id(email)) == 2


async def test_corrective_retry_success_persists_both_turns(client: AsyncClient) -> None:
    """A grounded corrective-retry reply is a success: both turns persist; the bad one does not.

    @trace FR-COACH-03
    """
    provider = ScriptedProvider([VIOLATING, GROUNDED])
    _override_provider(provider)
    email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["fallback"] is False
    assert provider.call_count == 2  # primary violation + one corrective retry, no Gemini
    contents = await _coach_message_contents(await _user_id(email))
    assert len(contents) == 2
    assert not any("180" in c for c in contents)  # the fabricated first output was never stored


async def test_fallback_chat_persists_neither_turn(client: AsyncClient) -> None:
    """A chat that degrades to the fallback card writes no turn -- no dangling user turn.

    @trace FR-COACH-03
    """
    provider = ScriptedProvider([MALFORMED, MALFORMED])
    _override_provider(provider)
    email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["fallback"] is True
    assert await _coach_message_count(await _user_id(email)) == 0


async def test_chat_history_is_isolated_per_user() -> None:
    """User A's history and stored turns are only A's; user B never sees them (FR-AUTH-07).

    @trace FR-COACH-03
    """
    marker = "ZZALPHAMARKERZZ"
    async with make_client() as client_a, make_client() as client_b:
        email_a, csrf_a = await _seed_user_with_session(client_a)
        email_b, csrf_b = await _seed_user_with_session(client_b)

        provider_a = ScriptedProvider([GROUNDED, GROUNDED])
        _override_provider(provider_a)
        await client_a.post(
            "/api/coach/chat", json={"user_message": f"{marker} first"}, headers=_csrf(csrf_a)
        )
        await client_a.post(
            "/api/coach/chat", json={"user_message": "second"}, headers=_csrf(csrf_a)
        )

        provider_b = ScriptedProvider([GROUNDED])
        _override_provider(provider_b)
        resp_b = await client_b.post(
            "/api/coach/chat", json={"user_message": "how about me?"}, headers=_csrf(csrf_b)
        )
        assert resp_b.status_code == 200, resp_b.text

        assert marker in provider_a.serialized()  # A's 2nd request carried A's own prior turn
        assert marker not in provider_b.serialized()  # B never sees A's history
        assert await _coach_message_count(await _user_id(email_a)) == 4
        assert await _coach_message_count(await _user_id(email_b)) == 2


async def test_empty_or_whitespace_chat_message_is_rejected_422_without_llm_call(
    client: AsyncClient,
) -> None:
    """An empty or whitespace-only user_message is rejected with 422 and makes no LLM call.

    @trace FR-COACH-03
    """
    provider = ScriptedProvider([])  # any call raises: proves none happens
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    empty = await client.post("/api/coach/chat", json={"user_message": ""}, headers=_csrf(csrf))
    blank = await client.post(
        "/api/coach/chat", json={"user_message": "   "}, headers=_csrf(csrf)
    )

    assert empty.status_code == 422, empty.text
    assert blank.status_code == 422, blank.text
    assert provider.call_count == 0


async def test_overlong_chat_message_is_rejected_422_without_llm_call(
    client: AsyncClient,
) -> None:
    """An over-long user_message (> ~2,000 chars) is rejected with 422, not clipped, no call.

    @trace FR-COACH-03
    """
    provider = ScriptedProvider([])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "a" * 2001}, headers=_csrf(csrf)
    )

    assert resp.status_code == 422, resp.text
    assert provider.call_count == 0


# --- FR-COACH-04: assembly is snapshot + history only, the real snapshot ------


async def test_request_carries_snapshot_and_history_only_no_raw_session_rows(
    client: AsyncClient,
) -> None:
    """The assembled request has the snapshot + turns and no raw session / pause row fields.

    @trace FR-COACH-04
    """
    provider = ScriptedProvider([GROUNDED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )
    assert resp.status_code == 200, resp.text

    request_blob = provider.serialized()
    assert "baselines" in request_blob  # the snapshot is present
    for raw_field in ("pause_segments", "paused_at", "resumed_at", "started_at", "ended_at"):
        assert raw_field not in request_blob  # no raw session / pause rows leak into the prompt


async def test_coach_feeds_the_real_stats_snapshot_artifact(client: AsyncClient) -> None:
    """The coach's snapshot is the same artifact GET /api/stats/snapshot serves (no re-derive).

    @trace FR-COACH-04
    """
    provider = ScriptedProvider([GROUNDED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client, minutes=73)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )
    assert resp.status_code == 200, resp.text

    snapshot = (await client.get("/api/stats/snapshot")).json()
    request_blob = provider.serialized()
    assert str(snapshot["volume"]["week_min"]) in request_blob
    assert str(snapshot["volume"]["all_time_min"]) in request_blob


# --- FR-COACH-05: fixed §4.2 shape, server-set marker, no emoji --------------


async def test_insight_payload_conforms_to_the_schema_with_marker_false(
    client: AsyncClient,
) -> None:
    """A normal insight conforms to §4.2 and carries the server-set fallback marker = false.

    @trace FR-COACH-05
    """
    provider = ScriptedProvider([NOTABLE])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["fallback"] is False


async def test_chat_reply_reuses_the_same_schema(client: AsyncClient) -> None:
    """A chat reply conforms to the same §4.2 structure with the marker = false.

    @trace FR-COACH-05
    """
    provider = ScriptedProvider([GROUNDED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["fallback"] is False


async def test_fallback_card_conforms_and_carries_no_number_with_marker_true(
    client: AsyncClient,
) -> None:
    """The fallback card is §4.2-conforming, number-free, quiet, with the marker = true.

    @trace FR-COACH-05
    """
    provider = ScriptedProvider([MALFORMED, MALFORMED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["fallback"] is True
    assert payload["quiet"] is True
    assert payload["recommendations"] == []
    assert len(payload["observations"]) == 1
    for value in _all_text(payload):
        assert not any(ch.isdigit() for ch in value)  # zero numeric content


async def test_emoji_emitting_model_still_yields_emoji_free_output(
    client: AsyncClient,
) -> None:
    """A stubbed emoji-emitting model degrades along the ladder to an emoji-free card.

    @trace FR-COACH-05
    """
    provider = ScriptedProvider([EMOJI, GROUNDED, GROUNDED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    _assert_card_shape(payload)
    for value in _all_text(payload):
        assert _EMOJI_RE.search(value) is None  # no emoji reaches the user


# --- FR-COACH-06: reply language follows the user's setting ------------------


async def test_ukrainian_preference_yields_uk_language(client: AsyncClient) -> None:
    """A user whose coach_language is uk gets a payload whose language field is "uk".

    The scripted card's language is "en"; the server-returned payload's language equals the
    user's stored setting regardless (FR-COACH-06: it SHALL equal that setting).

    @trace FR-COACH-06
    """
    provider = ScriptedProvider([_card_json(observations=["ok"], recommendations=[], quiet=True)])
    _override_provider(provider)
    email, csrf = await _seed_user_with_session(client)
    await _set_coach_language(email, "uk")

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    assert resp.json()["language"] == "uk"


async def test_default_language_is_english(client: AsyncClient) -> None:
    """A default user (coach_language en) gets a payload whose language field is "en".

    @trace FR-COACH-06
    """
    provider = ScriptedProvider([_card_json(observations=["ok"], recommendations=[], quiet=True)])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    assert resp.json()["language"] == "en"


# --- FR-COACH-07: graceful degradation via the one provider ladder -----------


async def test_malformed_on_both_models_degrades_to_fallback_no_crash(
    client: AsyncClient,
) -> None:
    """Malformed JSON on the primary and the fallback model degrades to the fallback card (E-8).

    @trace FR-COACH-07
    """
    provider = ScriptedProvider([MALFORMED, MALFORMED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text  # no uncaught 500
    payload = resp.json()
    _assert_card_shape(payload)
    assert payload["fallback"] is True
    for value in _all_text(payload):
        assert not any(ch.isdigit() for ch in value)  # renders no fabricated number


async def test_primary_failure_makes_a_single_gemini_attempt_then_a_card(
    client: AsyncClient,
) -> None:
    """A twice-violating primary yields exactly one Gemini 3 Flash attempt, then a grounded card.

    Pins TC-LLM-01's exact ids and the single-fallback-attempt shape of the ladder.

    @trace FR-COACH-07
    """
    provider = ScriptedProvider([VIOLATING, VIOLATING, GROUNDED])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["fallback"] is False
    assert provider.call_count == 3
    assert provider.models() == [PRIMARY_MODEL, PRIMARY_MODEL, FALLBACK_MODEL]


async def test_missing_api_key_degrades_to_fallback_without_calling_the_provider(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """With no API key the coach returns the fallback card and never calls the provider.

    @trace FR-COACH-07
    """
    monkeypatch.setattr(get_settings(), "google_ai_api_key", None)
    provider = ScriptedProvider([])  # any call raises -> proves the ladder never started
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post("/api/coach/insight", headers=_csrf(csrf))

    assert resp.status_code == 200, resp.text
    assert resp.json()["fallback"] is True
    assert provider.call_count == 0


async def test_provider_error_on_any_model_id_degrades_gracefully(
    client: AsyncClient,
) -> None:
    """A provider error (e.g. a rejected model id) on both models degrades, never crashes.

    @trace FR-COACH-07
    """
    provider = ScriptedProvider([_ProviderBoom("rejected"), _ProviderBoom("rejected")])
    _override_provider(provider)
    _email, csrf = await _seed_user_with_session(client)

    resp = await client.post(
        "/api/coach/chat", json={"user_message": "How am I doing?"}, headers=_csrf(csrf)
    )

    assert resp.status_code == 200, resp.text  # never an unhandled 500
    assert resp.json()["fallback"] is True
