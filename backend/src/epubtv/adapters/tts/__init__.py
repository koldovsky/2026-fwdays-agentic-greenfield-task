"""TTS adapters (TTS-01 + TTS-02).

The base ``HttpTTSAdapter`` (TTS-01) is non-overridable — the
``model`` parameter has no default; ``synthesize(...)`` raises
``NotImplementedError``. The production subclass
(``OpenAIHttpTTSAdapter``) is added in plan 01-02 Task 2.

The in-process ``MockTTSAdapter`` (Phase 3 sprint default) moved to
``tests/unit/_adapters/`` as a test-only fixture per BACK-01 + plan
01-02. Production code paths import the base class or the
``OpenAIHttpTTSAdapter`` subclass.
"""

from __future__ import annotations

__all__: list[str] = []
