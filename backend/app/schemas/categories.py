"""Category request/response schemas (Pydantic v2).

Kept separate from the ORM model (python-fastapi skill): ``CategoryCreate`` and
``CategoryUpdate`` validate input, ``CategoryRead`` serializes a row. Server-side
hex-format validation of ``color`` is intentionally *not* imposed here (design
Open question 5 is unresolved); only presence/non-emptiness is enforced.
"""

from pydantic import BaseModel, ConfigDict, Field, field_validator

_MAX_NAME = 100
_MAX_COLOR = 32
_MAX_DESCRIPTION = 500


def _clean_required(value: str) -> str:
    """Trim and reject an empty required string."""
    value = value.strip()
    if not value:
        raise ValueError("must not be empty")
    return value


class CategoryCreate(BaseModel):
    """Input for ``POST /api/categories`` — name and color required."""

    name: str = Field(max_length=_MAX_NAME)
    color: str = Field(max_length=_MAX_COLOR)
    description: str | None = Field(default=None, max_length=_MAX_DESCRIPTION)

    @field_validator("name", "color")
    @classmethod
    def _require_non_empty(cls, value: str) -> str:
        return _clean_required(value)


class CategoryUpdate(BaseModel):
    """Partial input for ``PATCH /api/categories/{id}`` — every field optional.

    The router applies only the fields the client actually sent (``exclude_unset``),
    so an absent field is left unchanged (true PATCH semantics).
    """

    name: str | None = Field(default=None, max_length=_MAX_NAME)
    color: str | None = Field(default=None, max_length=_MAX_COLOR)
    description: str | None = Field(default=None, max_length=_MAX_DESCRIPTION)

    @field_validator("name", "color")
    @classmethod
    def _require_non_empty(cls, value: str | None) -> str | None:
        return None if value is None else _clean_required(value)


class CategoryRead(BaseModel):
    """Public category shape returned by create / list / edit."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    color: str
    description: str | None
