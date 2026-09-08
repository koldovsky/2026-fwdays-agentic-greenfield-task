"""Authentication use-cases: register, login, logout, and session resolution.

Orchestrates the user_id-scoped repos + the pure security core, and owns the
transaction (commits here; routers stay thin). Expected failures surface as the
domain errors below, which the router maps to HTTP status codes.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core import security
from app.models.user import User
from app.repos.user_sessions import UserSessionRepository
from app.repos.users import UserRepository


class EmailAlreadyRegisteredError(Exception):
    """Registration attempted with an email that already has an account (-> 409)."""


class InvalidCredentialsError(Exception):
    """Login credentials do not match a stored account (-> 401)."""


@dataclass(frozen=True)
class LoginResult:
    """Everything the API needs to establish the session + CSRF cookies."""

    user: User
    session_token: str
    csrf_token: str


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._users = UserRepository(session)
        self._sessions = UserSessionRepository(session)

    async def register(self, *, email: str, password: str) -> User:
        """Create an account; reject a duplicate email (case-insensitive)."""
        email = email.strip()
        if await self._users.get_by_email(email) is not None:
            raise EmailAlreadyRegisteredError(email)
        password_hash = security.hash_password(password)
        try:
            user = await self._users.create(email=email, password_hash=password_hash)
            await self._session.commit()
        except IntegrityError as exc:
            # Unique-email race between the check above and the insert.
            await self._session.rollback()
            raise EmailAlreadyRegisteredError(email) from exc
        return user

    async def login(self, *, email: str, password: str) -> LoginResult:
        """Verify credentials and open a session; raise on any mismatch."""
        settings = get_settings()
        user = await self._users.get_by_email(email.strip())
        if user is None or user.password_hash is None:
            # Equalize timing so a missing/passwordless account is indistinguishable
            # from a wrong password (user-enumeration defense).
            security.fake_verify()
            raise InvalidCredentialsError()
        if not security.verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.session_ttl_days)
        token = security.generate_session_token()
        csrf_token = security.generate_csrf_token()
        await self._sessions.create(user_id=user.id, token=token, expires_at=expires_at)
        await self._session.commit()
        return LoginResult(user=user, session_token=token, csrf_token=csrf_token)

    async def logout(self, *, user_id: int, token: str) -> None:
        """End the session identified by ``token`` for ``user_id``."""
        await self._sessions.delete(user_id=user_id, token=token)
        await self._session.commit()

    async def authenticate(self, token: str) -> User | None:
        """Resolve a session cookie to its user, sliding the 30-day expiry forward.

        Returns None for a missing, expired, or dangling session — the auth
        dependency turns that into a 401 (FR-AUTH-06).
        """
        settings = get_settings()
        now = datetime.now(timezone.utc)
        session_row = await self._sessions.get_active_by_token(token, now=now)
        if session_row is None:
            return None
        user = await self._users.get_by_id(session_row.user_id)
        if user is None:
            return None
        new_expiry = now + timedelta(days=settings.session_ttl_days)
        await self._sessions.extend_expiry(user_id=user.id, token=token, expires_at=new_expiry)
        await self._session.commit()
        return user
