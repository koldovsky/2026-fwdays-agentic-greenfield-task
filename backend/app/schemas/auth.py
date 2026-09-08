"""Auth request/response schemas.

Password is bounded at 72 characters because that is bcrypt's effective input
limit. Email uses a minimal shape check only — no ``email-validator`` dependency
is added in this slice; the CITEXT column and its unique constraint are the real
guardrails for correctness and case-insensitive uniqueness.
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator

_MIN_PASSWORD = 8
_MAX_PASSWORD = 72  # bcrypt truncates beyond 72 bytes; bound the input up front.
_MAX_EMAIL = 254


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=_MIN_PASSWORD, max_length=_MAX_PASSWORD)

    @field_validator("email")
    @classmethod
    def _validate_email(cls, value: str) -> str:
        value = value.strip()
        if len(value) > _MAX_EMAIL:
            raise ValueError("email too long")
        local, sep, domain = value.partition("@")
        has_valid_domain = "." in domain and not domain.startswith(".") and not domain.endswith(".")
        if not sep or not local or not has_valid_domain:
            raise ValueError("invalid email address")
        return value


class LoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=1, max_length=_MAX_PASSWORD)

    @field_validator("email")
    @classmethod
    def _strip_email(cls, value: str) -> str:
        return value.strip()


class UserRead(BaseModel):
    """Public account shape returned by register / login / GET me."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    timezone: str
    coach_language: str


class LoginResponse(BaseModel):
    user: UserRead
    csrf_token: str
