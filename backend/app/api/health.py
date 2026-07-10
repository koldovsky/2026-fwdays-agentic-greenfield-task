"""Health / readiness endpoints used to verify the stack is wired together."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session

router = APIRouter(tags=["health"])

SessionDep = Annotated[AsyncSession, Depends(get_session)]


@router.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe — succeeds if the app process is up. No external dependencies."""
    return {"status": "ok"}


@router.get("/health/db")
async def health_db(session: SessionDep) -> dict[str, str]:
    """Readiness probe — verifies PostgreSQL connectivity with a trivial query."""
    result = await session.execute(text("SELECT 1"))
    return {"status": "ok", "db": "ok", "result": str(result.scalar_one())}
