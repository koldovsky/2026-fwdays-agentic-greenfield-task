"""Email + password authentication router (FR-AUTH-01/02/03/06/07).

Thin transport: validate the request, call ``AuthService``, translate domain
errors to HTTP status codes, and manage the session + CSRF cookies.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.deps import CurrentUser, SessionDep, require_csrf
from app.config import get_settings
from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserRead
from app.services.auth import (
    AuthService,
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _set_auth_cookies(response: Response, *, session_token: str, csrf_token: str) -> None:
    """Set the HttpOnly session cookie and the JS-readable CSRF cookie."""
    settings = get_settings()
    max_age = settings.session_ttl_days * 24 * 60 * 60
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        max_age=max_age,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
    )
    response.set_cookie(
        key=settings.csrf_cookie_name,
        value=csrf_token,
        max_age=max_age,
        httponly=False,  # the frontend reads this and echoes it in the CSRF header
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    """Expire both auth cookies (same attributes so browsers actually drop them)."""
    settings = get_settings()
    response.delete_cookie(
        settings.session_cookie_name,
        path="/",
        secure=settings.session_cookie_secure,
        httponly=True,
        samesite=settings.session_cookie_samesite,
    )
    response.delete_cookie(
        settings.csrf_cookie_name,
        path="/",
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, session: SessionDep) -> UserRead:
    """Create an account from email + password; 409 if the email already exists."""
    try:
        user = await AuthService(session).register(
            email=payload.email, password=payload.password
        )
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        ) from exc
    return UserRead.model_validate(user)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, session: SessionDep, response: Response) -> LoginResponse:
    """Verify credentials, open a session, and set the session + CSRF cookies."""
    try:
        result = await AuthService(session).login(email=payload.email, password=payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        ) from exc
    _set_auth_cookies(response, session_token=result.session_token, csrf_token=result.csrf_token)
    return LoginResponse(user=UserRead.model_validate(result.user), csrf_token=result.csrf_token)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf)],
)
async def logout(
    request: Request, session: SessionDep, response: Response, user: CurrentUser
) -> None:
    """Delete the session row and clear the cookies (requires auth + CSRF)."""
    token = request.cookies.get(get_settings().session_cookie_name)
    if token:
        await AuthService(session).logout(user_id=user.id, token=token)
    _clear_auth_cookies(response)


@router.get("/me", response_model=UserRead)
async def me(user: CurrentUser) -> UserRead:
    """Return the authenticated account (401 without a valid session)."""
    return UserRead.model_validate(user)
