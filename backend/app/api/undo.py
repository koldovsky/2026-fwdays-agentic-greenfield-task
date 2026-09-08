"""Undo router (FR-NOTIF-01), behind the slice 001 auth boundary.

Thin transport: ``POST /api/undo/{token}`` takes ``CurrentUser`` and the CSRF
double-submit, then dispatches to ``UndoService``. A dead token (unknown,
expired, consumed, or another user's) is ``404``; an un-discard blocked by a new
active session is ``409``; success is ``200``.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import CurrentUser, SessionDep, require_csrf
from app.services.undo import UndoDiscardConflictError, UndoNotFoundError, UndoService

router = APIRouter(prefix="/api/undo", tags=["undo"])


@router.post(
    "/{token}",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_csrf)],
)
async def apply_undo(
    token: str, session: SessionDep, user: CurrentUser
) -> dict[str, bool]:
    """Restore the before-image for ``token`` (single-use)."""
    try:
        await UndoService(session).apply(user_id=user.id, token=token)
    except UndoNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Undo token not found or expired"
        ) from exc
    except UndoDiscardConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot restore: an active session already exists",
        ) from exc
    return {"undone": True}
