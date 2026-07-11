"""Application layer — domain services own workflow logic.

These services do NOT import provider SDKs directly (architecture.md); they
consume the four Protocol ports bound at the FastAPI lifespan DI composition
root in ``api/app.py``.
"""

__all__: list[str] = []
