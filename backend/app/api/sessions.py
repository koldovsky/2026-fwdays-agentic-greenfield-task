"""Saved-session router (FR-SESS-01..06), behind the slice 001 auth boundary.

Thin transport: every route takes ``CurrentUser``; mutations require the CSRF
double-submit. Validate -> ``SessionService`` -> return. Cross-user access is a
``404`` (existence is not revealed); invalid bounds are a ``422``. Edit returns
the updated session plus an undo token; delete returns just the token (200).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, SessionDep, require_csrf
from app.schemas.sessions import (
    SessionCreate,
    SessionEditRead,
    SessionRead,
    SessionUpdate,
    UndoTokenResponse,
)
from app.services.sessions import (
    InvalidSessionBoundsError,
    SessionCategoryNotFoundError,
    SessionNotFoundError,
    SessionService,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

_NOT_FOUND_DETAIL = "Session not found"
_CATEGORY_NOT_FOUND_DETAIL = "Category not found"


def _not_found() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=_NOT_FOUND_DETAIL)


def _category_not_found() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND, detail=_CATEGORY_NOT_FOUND_DETAIL
    )


def _invalid_bounds(exc: InvalidSessionBoundsError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc))


@router.get("", response_model=list[SessionRead])
async def list_sessions(session: SessionDep, user: CurrentUser) -> list[SessionRead]:
    """List the user's saved sessions, newest-first, each with gross/net durations."""
    rows = await SessionService(session).list_log(user_id=user.id)
    return [SessionRead.from_orm_session(row) for row in rows]


@router.post(
    "",
    response_model=SessionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_csrf)],
)
async def add_session(
    payload: SessionCreate, session: SessionDep, user: CurrentUser
) -> SessionRead:
    """Manually add a past session with optional pauses (source ``manual``)."""
    pauses = [(pause.paused_at, pause.resumed_at) for pause in payload.pauses]
    try:
        saved = await SessionService(session).add_manual(
            user_id=user.id,
            category_id=payload.category_id,
            started_at=payload.started_at,
            ended_at=payload.ended_at,
            notes=payload.notes,
            pauses=pauses,
        )
    except SessionCategoryNotFoundError as exc:
        raise _category_not_found() from exc
    except InvalidSessionBoundsError as exc:
        raise _invalid_bounds(exc) from exc
    return SessionRead.from_orm_session(saved)


@router.patch(
    "/{session_id}",
    response_model=SessionEditRead,
    dependencies=[Depends(require_csrf)],
)
async def edit_session(
    session_id: int, payload: SessionUpdate, session: SessionDep, user: CurrentUser
) -> SessionEditRead:
    """Edit a session (incl. its pause set); returns the row plus an undo token."""
    pauses = (
        None
        if payload.pauses is None
        else [(pause.paused_at, pause.resumed_at) for pause in payload.pauses]
    )
    try:
        row, token = await SessionService(session).edit(
            user_id=user.id,
            session_id=session_id,
            category_id=payload.category_id,
            started_at=payload.started_at,
            ended_at=payload.ended_at,
            notes=payload.notes,
            pauses=pauses,
        )
    except SessionNotFoundError as exc:
        raise _not_found() from exc
    except SessionCategoryNotFoundError as exc:
        raise _category_not_found() from exc
    except InvalidSessionBoundsError as exc:
        raise _invalid_bounds(exc) from exc
    base = SessionRead.from_orm_session(row)
    return SessionEditRead(**base.model_dump(), undo_token=token)


@router.delete(
    "/{session_id}",
    response_model=UndoTokenResponse,
    dependencies=[Depends(require_csrf)],
)
async def delete_session(
    session_id: int, session: SessionDep, user: CurrentUser
) -> UndoTokenResponse:
    """Delete a session (pauses cascade); returns the undo token (200)."""
    try:
        token = await SessionService(session).delete(user_id=user.id, session_id=session_id)
    except SessionNotFoundError as exc:
        raise _not_found() from exc
    return UndoTokenResponse(undo_token=token)
