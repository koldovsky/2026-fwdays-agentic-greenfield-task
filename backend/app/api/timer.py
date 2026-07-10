"""Live-timer router (FR-TIMER-01..06), behind the slice 001 auth boundary.

Thin transport: every route takes ``CurrentUser`` (per-user isolation) and
requires the CSRF double-submit on the mutation. Validate -> ``TimerService`` ->
return; domain errors map to HTTP status codes (404 no-active / foreign category,
409 second-active / invalid transition / stale version).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, SessionDep, require_csrf
from app.schemas.sessions import (
    ActiveSessionRead,
    SessionRead,
    TimerStartRequest,
    TimerStopRequest,
    TimerVersionRequest,
    UndoTokenResponse,
)
from app.services.timer import (
    ActiveSessionExistsError,
    InvalidTimerTransitionError,
    NoActiveSessionError,
    TimerCategoryNotFoundError,
    TimerService,
)

router = APIRouter(prefix="/api/timer", tags=["timer"])

_NO_ACTIVE_DETAIL = "No active session"
_CONFLICT_DETAIL = "Timer state conflict"
_SECOND_ACTIVE_DETAIL = "An active session already exists"
_CATEGORY_NOT_FOUND_DETAIL = "Category not found"


def _no_active() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NO_ACTIVE_DETAIL)


def _conflict() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=_CONFLICT_DETAIL)


@router.post(
    "/start",
    response_model=ActiveSessionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def start_timer(
    payload: TimerStartRequest, session: SessionDep, user: CurrentUser
) -> ActiveSessionRead:
    """Start the single active timer for a category the user owns."""
    try:
        row = await TimerService(session).start(user_id=user.id, category_id=payload.category_id)
    except TimerCategoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_CATEGORY_NOT_FOUND_DETAIL
        ) from exc
    except ActiveSessionExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=_SECOND_ACTIVE_DETAIL
        ) from exc
    return ActiveSessionRead.from_orm_active(row)


@router.post(
    "/pause",
    response_model=ActiveSessionRead,
    dependencies=[Depends(require_csrf)],
)
async def pause_timer(
    payload: TimerVersionRequest, session: SessionDep, user: CurrentUser
) -> ActiveSessionRead:
    """Pause the running timer (open a pause span)."""
    try:
        row = await TimerService(session).pause(user_id=user.id, version=payload.version)
    except NoActiveSessionError as exc:
        raise _no_active() from exc
    except InvalidTimerTransitionError as exc:
        raise _conflict() from exc
    return ActiveSessionRead.from_orm_active(row)


@router.post(
    "/continue",
    response_model=ActiveSessionRead,
    dependencies=[Depends(require_csrf)],
)
async def continue_timer(
    payload: TimerVersionRequest, session: SessionDep, user: CurrentUser
) -> ActiveSessionRead:
    """Continue a paused timer (close the open pause span)."""
    try:
        row = await TimerService(session).resume(user_id=user.id, version=payload.version)
    except NoActiveSessionError as exc:
        raise _no_active() from exc
    except InvalidTimerTransitionError as exc:
        raise _conflict() from exc
    return ActiveSessionRead.from_orm_active(row)


@router.post(
    "/stop",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def stop_timer(
    payload: TimerStopRequest, session: SessionDep, user: CurrentUser
) -> SessionRead:
    """Stop and save the session with the save-modal's notes + final category."""
    try:
        saved = await TimerService(session).stop(
            user_id=user.id,
            version=payload.version,
            category_id=payload.category_id,
            notes=payload.notes,
        )
    except NoActiveSessionError as exc:
        raise _no_active() from exc
    except InvalidTimerTransitionError as exc:
        raise _conflict() from exc
    except TimerCategoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=_CATEGORY_NOT_FOUND_DETAIL
        ) from exc
    return SessionRead.from_orm_session(saved)


@router.post(
    "/discard",
    response_model=UndoTokenResponse,
    dependencies=[Depends(require_csrf)],
)
async def discard_timer(
    payload: TimerVersionRequest, session: SessionDep, user: CurrentUser
) -> UndoTokenResponse:
    """Discard the active timer (confirmed client-side), persisting nothing."""
    try:
        token = await TimerService(session).discard(user_id=user.id, version=payload.version)
    except NoActiveSessionError as exc:
        raise _no_active() from exc
    except InvalidTimerTransitionError as exc:
        raise _conflict() from exc
    return UndoTokenResponse(undo_token=token)
