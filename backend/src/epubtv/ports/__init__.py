"""Hexagonal ports (typing.Protocol).

Each Protocol is the seam between the application layer (workflow services)
and the adapter layer (mock / real provider implementations). Mocks are
first-class production adapters bound at the FastAPI lifespan DI composition
root in ``api/app.py`` (Anti-Pattern 2: mocks live in ``adapters/``, not
``tests/``).

Phase 1 declares only the shapes Phase 1 + Phase 2 expect; the four ports are
stable enough that Phase 2 does not redefine them. See:
- RESEARCH.md Pattern 1 (Hexagonal Ports + Lifespan DI)
- architecture.md (hexagonal ports, ``job_type`` discriminator)
- CONVENTIONS.md §Mock provider harness
"""

from __future__ import annotations

from .file_store_port import FileStorePort
from .job_repo_port import JobRepoPort
from .translation_port import TranslationPort
from .tts_port import TTSPort

__all__ = [
    "FileStorePort",
    "JobRepoPort",
    "TTSPort",
    "TranslationPort",
]
