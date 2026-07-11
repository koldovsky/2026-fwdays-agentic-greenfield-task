"""``/api/v1/health/*`` router (Phase 2, D-09).

The bare ``/health`` route is the Phase 1 walking-skeleton liveness
probe (returns ``{"status":"ok"}``); it is defined inline in
``api/app.py`` to preserve its unprefixed path. This router carries
ONLY the Phase 2 ``/api/v1/health/*`` routes (D-09 NLTK data package
health).

Locked D-09 response shape — see ``HealthNltkResponse`` in
``api.schemas``. The 6-key payload is the single source of truth for
the F2 frontend notice banner.
"""

from __future__ import annotations

from fastapi import APIRouter

from epubtv.api.schemas import HealthNltkResponse
from epubtv.domain.nltk_languages import compute_health

router = APIRouter()


@router.get("/health/nltk", response_model=HealthNltkResponse)
async def health_nltk() -> HealthNltkResponse:
    """D-09: NLTK ``punkt`` + ``punkt_tab`` install state + supported langs.

    Single source of truth is ``domain.nltk_languages.compute_health``
    (shipped in plan 02-01). The route is a thin wrapper that
    validates the response against ``HealthNltkResponse`` (Pydantic
    v2 ``extra="forbid"``).
    """
    data = compute_health()
    return HealthNltkResponse.model_validate(data)
