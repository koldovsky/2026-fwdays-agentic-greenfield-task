"""Coach router (FR-COACH-01/03/05/06/07), behind the slice 001 auth boundary.

Thin transport: both routes take ``CurrentUser`` (per-user isolation, FR-AUTH-07) and the
reused CSRF double-submit guard (mutating POSTs). The model transport is injected via the
``get_coach_provider`` seam so tests drive the ladder deterministically with no live call
(NFR-COST-01). Validate -> ``CoachService`` -> return the §4.2 card; the service owns the
provider ladder, grounding, persistence, and the read-through cache.
"""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.deps import CurrentUser, SessionDep, require_csrf
from app.schemas.coach import ChatRequest, CoachCard
from app.services.coach import CoachProvider, CoachService, get_coach_provider

router = APIRouter(prefix="/api/coach", tags=["coach"])

ProviderDep = Annotated[CoachProvider, Depends(get_coach_provider)]


@router.post("/insight", response_model=CoachCard, dependencies=[Depends(require_csrf)])
async def create_insight(
    session: SessionDep, user: CurrentUser, provider: ProviderDep
) -> CoachCard:
    """Return the current-week insight card (read-through ``coach_insights`` cache)."""
    return await CoachService(session, provider).insight(user_id=user.id)


@router.post("/chat", response_model=CoachCard, dependencies=[Depends(require_csrf)])
async def create_chat(
    payload: ChatRequest, session: SessionDep, user: CurrentUser, provider: ProviderDep
) -> CoachCard:
    """Answer one chat turn grounded in the snapshot + the user's stored history."""
    return await CoachService(session, provider).chat(
        user_id=user.id, user_message=payload.user_message
    )
