"""Shared FastAPI dependencies: DB session, current user, and the CSRF guard."""

import secrets
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.models.user import User
from app.services.auth import AuthService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user(request: Request, session: SessionDep) -> User:
    """Resolve the session cookie to the current user, or 401 (FR-AUTH-06).

    A missing, expired, or invalid session all yield the same 401 so the response
    never distinguishes them.
    """
    settings = get_settings()
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    user = await AuthService(session).authenticate(token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def require_csrf(request: Request) -> None:
    """Enforce the CSRF double-submit on mutating requests (architecture §8.2).

    The JS-readable CSRF cookie must be echoed back in the configured header and
    match it exactly. Compared in constant time. Applied to authenticated
    mutations; register/login are exempt as the pre-session bootstrap that issues
    the token.
    """
    settings = get_settings()
    cookie = request.cookies.get(settings.csrf_cookie_name)
    header = request.headers.get(settings.csrf_header_name)
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing or invalid",
        )
