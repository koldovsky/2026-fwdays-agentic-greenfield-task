"""``/api/v1/health/nltk`` HTTP endpoint unit tests (TDD Task 2 RED).

Covers the locked D-09 response shape, the response-model ``extra=forbid``
discipline, and the no-NLTK-data fallback path.
"""

from __future__ import annotations

from typing import Any

import httpx
import pytest

pytestmark = [pytest.mark.asyncio, pytest.mark.tcid("XLATE-01-UT21")]


async def test_health_nltk_returns_200_with_four_key_shape(app: Any, db_path: Any) -> None:
    """``GET /api/v1/health/nltk`` returns the locked 4-key D-09 shape."""
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/api/v1/health/nltk")
    assert r.status_code == 200
    body = r.json()
    assert set(body.keys()) == {
        "supported_languages",
        "fallback_languages",
        "suggest_command",
        "install_size_mb_estimate",
    }
    assert isinstance(body["supported_languages"], list)
    assert isinstance(body["fallback_languages"], list)
    assert body["suggest_command"] is None or body["suggest_command"].startswith(
        "python -m nltk.downloader"
    )
    assert all(isinstance(s, str) for s in body["supported_languages"])
    assert all(isinstance(s, str) for s in body["fallback_languages"])


async def test_health_nltk_response_model_rejects_extra_field(app: Any, db_path: Any) -> None:
    """The endpoint's response model ``extra="forbid"`` is enforced."""
    from pydantic import ValidationError

    from epubtv.api.schemas import HealthNltkResponse

    with pytest.raises(ValidationError) as exc:
        HealthNltkResponse(
            supported_languages=[],
            fallback_languages=[],
            # pyrefly: ignore [unexpected-keyword]
            extra="y",
        )
    assert "extra" in str(exc.value)


async def test_health_nltk_with_no_nltk_data_reports_fallback(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When no NLTK data is installed, ``fallback_languages`` equals the
    supported set and ``suggest_command`` is populated.
    """
    monkeypatch.setattr(
        "epubtv.domain.nltk_languages._nltk_resource_installed",
        lambda resource: False,
    )
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/api/v1/health/nltk")
    assert r.status_code == 200
    body = r.json()
    from epubtv.domain.nltk_languages import SUPPORTED_LANGUAGES

    assert set(body["supported_languages"]) == set(SUPPORTED_LANGUAGES)
    assert set(body["fallback_languages"]) == set(SUPPORTED_LANGUAGES)
    assert body["suggest_command"] is not None
    assert "punkt_tab" in body["suggest_command"]
    assert body["install_size_mb_estimate"] is not None


async def test_health_nltk_with_all_data_reports_no_install(
    app: Any, db_path: Any, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When the NLTK package is installed, ``fallback_languages`` is empty
    and ``suggest_command`` is ``None``.
    """
    monkeypatch.setattr(
        "epubtv.domain.nltk_languages._nltk_resource_installed",
        lambda resource: True,
    )
    transport = httpx.ASGITransport(app=app)
    async with (
        httpx.AsyncClient(transport=transport, base_url="http://test") as ac,
        app.router.lifespan_context(app),
    ):
        r = await ac.get("/api/v1/health/nltk")
    assert r.status_code == 200
    body = r.json()
    assert body["fallback_languages"] == []
    assert body["suggest_command"] is None
    assert body["install_size_mb_estimate"] is None
