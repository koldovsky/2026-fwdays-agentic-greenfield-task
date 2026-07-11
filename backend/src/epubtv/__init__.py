"""EPUB Translator & Voice-Over backend package.

Hexagonal (Ports & Adapters) skeleton. Phase 1 ships the walking-skeleton
foundation — four Protocol ports bound at the FastAPI lifespan DI composition
root, a BehaviourSpec failure-injection seam, SQLite WAL repository, Alembic
0001 migration, ``/health`` route, and the ``{error:{code,message,details?}}``
envelope handler. Phases 2–4 wire into these seams without retrofit.
"""

__version__ = "0.1.0"
