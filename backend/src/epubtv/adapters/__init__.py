"""Adapters — first-class production implementations of the four Protocol ports.

The in-process ``MockTranslationAdapter`` + ``MockTTSAdapter`` (the
sprint default) live in ``tests/unit/_adapters/`` as test-only
fixtures (BACK-01, plan 01-02). The production adapters are the
``OllamaHttpTranslationAdapter`` + ``OpenAIHttpTranslationAdapter`` +
``OpenAIHttpTTSAdapter`` HTTP adapter subclasses (TRAN-02 + TTS-02),
each a thin wrapper over the corresponding first-party Python client
(openai>=1.50,<2.0 + ollama>=0.4,<1.0 per ADR-0012). The
``HttpTranslationAdapter`` + ``HttpTTSAdapter`` base classes are
non-overridable (the ``model`` parameter has no default; ``translate`` /
``synthesize`` raise ``NotImplementedError`` so a caller that
accidentally instantiates the base class gets a loud failure).
"""

__all__: list[str] = []
