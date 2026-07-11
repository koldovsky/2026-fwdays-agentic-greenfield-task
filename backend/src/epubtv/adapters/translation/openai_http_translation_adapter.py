"""OpenAIHttpTranslationAdapter — TRAN-02.

Phase 1 plan 01-02 (TRAN-02): ``OpenAIHttpTranslationAdapter`` is a
production translation provider that uses the official ``openai``
Python SDK (``>=1.50,<2.0``) per ADR-0012. The adapter POSTs to
the OpenAI-compatible ``/v1/chat/completions`` endpoint via
``openai.AsyncOpenAI(base_url=base_url, api_key=api_key or "EMPTY")``
+ ``await client.chat.completions.create(model=model,
messages=[{"role": "user", "content": source_text}],
temperature=0.0)`` and returns ``response.choices[0].message.content``.

**Note on sync vs async client:** the plan's prose mentions
``openai.OpenAI(...)`` (the sync client), but for an async adapter
the correct client is ``openai.AsyncOpenAI(...)`` (the async
counterpart). The async client has the same shape (same
``base_url=`` / ``api_key=`` params; same
``chat.completions.create(...)`` signature) but its ``close()`` is
truly async (``await client.close()`` works) and its
``chat.completions.create(...)`` returns an awaitable. The sync
``openai.OpenAI.close()`` is synchronous (returns ``None``, not
awaitable) — using the sync client from an async adapter would
require wrapping the close in ``asyncio.to_thread(...)`` and the
chat call would block the event loop. The async client is the
canonical choice for async adapters per the ``openai`` SDK docs.

The ``api_key`` parameter is optional (``api_key: str | None = None``)
because some OpenAI-compatible providers (Ollama in OpenAI-compat mode,
local LM Studio, vLLM, etc.) do not require a key. The OpenAI SDK
refuses to construct without an ``api_key`` parameter, so the
``api_key or "EMPTY"`` substitution lets the SDK talk to keyless
endpoints. The key is never logged (the structured-logger field is
opt-in; the adapter does not log the key).

The ``aclose()`` method calls ``await self._client.close()`` — the
``AsyncOpenAI`` client's async ``close()`` (the underlying
``httpx.AsyncClient`` the SDK wraps is closed). The subclass sets
its own ``_client`` attribute in ``__init__`` to the
``openai.AsyncOpenAI`` instance (the base class no longer
constructs an ``httpx.AsyncClient``; it only normalises the base
URL). The trailing-slash guard is preserved (the base class
``__init__`` runs it; the SDK uses the same normalised base URL).
"""

from __future__ import annotations

import openai

from epubtv.adapters.translation.http_translation_adapter import (
    HttpTranslationAdapter,
)


class OpenAIHttpTranslationAdapter(HttpTranslationAdapter):
    """Async OpenAI-compatible translation provider (TRAN-02).

    Uses ``openai.AsyncOpenAI(base_url=..., api_key=api_key or
    "EMPTY")`` + ``await client.chat.completions.create(...)`` per
    ADR-0012. The ``aclose()`` method calls ``await
    self._client.close()``.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        *,
        api_key: str | None = None,
    ) -> None:
        # Trailing-slash normalisation is preserved via the base class
        # ``__init__``; the ``openai.AsyncOpenAI`` below uses the same
        # normalised base URL so the wire round-trip is consistent.
        super().__init__(base_url=base_url, model=model)
        # The OpenAI SDK's ``base_url=`` is a generic OpenAI-compatible
        # endpoint seam — we pass the ``_base_url`` (which already
        # includes the trailing ``/``). The ``api_key or "EMPTY"``
        # substitution lets the SDK talk to keyless OpenAI-compatible
        # endpoints (Ollama, local LM Studio, vLLM, etc.). The key
        # is never logged.
        self._client = openai.AsyncOpenAI(
            base_url=self._base_url,
            api_key=api_key or "EMPTY",
        )

    async def translate(
        self,
        chunk_id: str,
        source_text: str,
        source_language: str | None,
        target_language: str,
    ) -> str:
        """Call ``client.chat.completions.create(...)`` and return the assistant content.

        Wire shape:
        - request: ``{"model": <model>, "messages": [{"role": "user",
          "content": <source_text>}], "temperature": 0.0}``
        - response: ``ChatCompletion`` typed object with
          ``choices[0].message.content`` carrying the translated text.

        ``chunk_id`` + ``source_language`` + ``target_language`` are
        accepted for ``TranslationPort`` Protocol parity but are NOT
        posted (the OpenAI shape does not carry any of them; the
        workflow service derives its own ``chunk_id`` for
        persistence; the model + message content drive the rest).
        """
        _ = (chunk_id, source_language, target_language)  # Protocol parity only
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[{"role": "user", "content": source_text}],
            temperature=0.0,
        )
        return response.choices[0].message.content

    async def aclose(self) -> None:
        """Close the ``openai.AsyncOpenAI`` client (async ``close()``).

        The base class no longer constructs an ``httpx.AsyncClient``;
        ``self._client`` is the ``openai.AsyncOpenAI`` instance set
        in this subclass's ``__init__``. Safe to call multiple
        times (the SDK's ``close()`` is idempotent).
        """
        await self._client.close()


__all__ = ["OpenAIHttpTranslationAdapter"]
