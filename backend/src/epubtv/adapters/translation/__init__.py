"""Translation adapters (TRAN-01 + TRAN-02).

The base ``HttpTranslationAdapter`` (TRAN-01) is non-overridable — the
``model`` parameter has no default; ``translate(...)`` raises
``NotImplementedError``. The two production subclasses
(``OllamaHttpTranslationAdapter`` + ``OpenAIHttpTranslationAdapter``)
are added in plan 01-02 Task 2.

The in-process ``MockTranslationAdapter`` (Phase 1 sprint default) moved
to ``tests/unit/_adapters/`` as a test-only fixture per BACK-01 + plan
01-02. Production code paths import the base class or one of the two
subclasses.
"""

from __future__ import annotations

__all__: list[str] = []
