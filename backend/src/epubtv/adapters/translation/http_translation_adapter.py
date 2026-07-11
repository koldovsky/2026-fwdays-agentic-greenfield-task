"""HTTP translation adapter — base class (TRAN-01, plan 01-02).

Phase 1 plan 01-02 (TRAN-01): ``HttpTranslationAdapter`` is now a
non-overridable base class. The ``model`` parameter has no default
(used to default to ``translategemma:12b``); ``translate(...)`` raises
``NotImplementedError`` with a class-qualified message so a caller that
accidentally instantiates the base class gets a loud failure (loud-
failure discipline per backend/AGENTS.md §Mandatory gotchas).

The two production subclasses (TRAN-02):

- ``OllamaHttpTranslationAdapter`` uses the official ``ollama`` Python
  client (``>=0.4,<1.0``) per ADR-0012 + plan 260711-1ww — calls
  ``client.generate(model=model, prompt=source_text)`` and returns
  ``response["response"]`` (the spec-documented
  ``/api/generate`` endpoint per ``docs/ollama-text-spec.yml``; the
  previous ``client.chat(...)`` targeted ``/api/chat`` which is NOT
  in the Ollama OpenAPI spec as of 0.1.0).

- ``OpenAIHttpTranslationAdapter`` uses the official ``openai`` Python
  SDK (``>=1.50,<2.0``) per ADR-0012 — calls
  ``client.chat.completions.create(model=model, messages=[...],
  temperature=0.0)`` and returns
  ``response.choices[0].message.content``.

Both subclasses live in ``translation/ollama_http_translation_adapter.py``
+ ``translation/openai_http_translation_adapter.py``. The base class
keeps the trailing-slash guard for inheritance; the subclasses own
their own HTTP client lifecycle (each ``aclose()`` method is
implemented per-subclass against the concrete Python client). The
base class intentionally does NOT expose a ``_client`` attribute or
an ``aclose()`` method — it is purely a normaliser + Protocol anchor.
"""

from __future__ import annotations


class HttpTranslationAdapter:
    """Async HTTP translation provider base class (TRAN-01).

    The base class is non-overridable. Subclasses MUST override
    ``translate(...)`` and ``aclose()`` to provide the actual
    translation call (either via the ``ollama`` Python client or
    the ``openai`` Python SDK per ADR-0012) and the matching async
    close. The ``model`` parameter is required (no default) so
    accidental ``HttpTranslationAdapter(base_url=...)`` instantiation
    gets a loud ``TypeError`` from the missing positional argument.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
    ) -> None:
        """Build the base-class adapter.

        ``base_url`` MUST end with a single ``/`` (forced via
        ``rstrip("/") + "/"`` — Pitfall 5). ``model`` is the
        provider-scoped model name; required (no default — the
        previous ``translategemma:12b`` default was removed per
        TRAN-01 so the base class cannot be silently instantiated
        with a wrong model).

        The base class does NOT construct an ``httpx.AsyncClient`` —
        each subclass owns its own HTTP transport (the ``ollama``
        Python client for ``OllamaHttpTranslationAdapter``, the
        ``openai.AsyncOpenAI`` SDK for ``OpenAIHttpTranslationAdapter``).
        The base class only normalises the base URL and exposes
        ``_base_url`` + ``_model`` to subclasses.
        """
        # Trailing-slash guard (Pitfall 5). httpx issues a silent
        # 307 redirect when the base URL and the relative path
        # disagree on trailing slashes; normalising here keeps the
        # ``POST {base_url}/...`` round-trip deterministic for any
        # subclass that uses an HTTP client.
        self._base_url = base_url.rstrip("/") + "/"
        self._model = model

    async def translate(
        self,
        chunk_id: str,
        source_text: str,
        source_language: str | None,
        target_language: str,
    ) -> str:
        """Raise ``NotImplementedError`` — subclasses MUST override.

        The base class is non-overridable per TRAN-01. A caller that
        accidentally instantiates ``HttpTranslationAdapter`` and calls
        ``translate(...)`` gets a loud failure with a class-qualified
        message so the regression is debuggable.
        """
        raise NotImplementedError(
            "HttpTranslationAdapter is a base class; use OllamaHttpTranslationAdapter or OpenAIHttpTranslationAdapter"
        )

    async def aclose(self) -> None:
        """Raise ``NotImplementedError`` — subclasses MUST override.

        The base class does not own an HTTP client, so it has
        nothing to close. Subclasses own the lifecycle of their
        concrete client (``ollama.AsyncClient`` /
        ``openai.AsyncOpenAI``) and MUST implement ``aclose()``
        to call the matching async close.
        """
        raise NotImplementedError(
            "HttpTranslationAdapter is a base class; subclasses MUST override aclose()"
        )


__all__ = ["HttpTranslationAdapter"]
