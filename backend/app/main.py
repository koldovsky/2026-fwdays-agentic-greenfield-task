"""FastAPI application factory and ASGI entrypoint (app.main:app)."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.health import router as health_router
from app.api.sessions import router as sessions_router
from app.api.stats import router as stats_router
from app.api.timer import router as timer_router
from app.api.undo import router as undo_router
from app.config import get_settings


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(categories_router)
    app.include_router(timer_router)
    app.include_router(sessions_router)
    app.include_router(undo_router)
    app.include_router(stats_router)
    return app


app = create_app()
