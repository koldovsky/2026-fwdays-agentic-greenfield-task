"""Test-only adapter fixtures (BACK-01, plan 01-02).

The in-process ``MockTranslationAdapter`` + ``MockTTSAdapter`` live here
as test-only fixtures; production adapters are the ``Ollama*`` /
``OpenAI*`` HTTP adapter subclasses in ``backend/src/epubtv/adapters/``.
"""
