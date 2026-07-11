"""OllamaHttpTranslationAdapter — TRAN-02.

Phase 1 plan 01-02 (TRAN-02) + plan 260711-1ww (Ollama wire-shape
alignment): ``OllamaHttpTranslationAdapter`` is a production
translation provider that uses the official ``ollama`` Python
client (``>=0.4,<1.0``) per ADR-0012. The adapter POSTs to Ollama's
``/api/generate`` endpoint via
``ollama.AsyncClient(host=base_url)`` +
``await client.generate(model=model, prompt=source_text)`` and
returns the generated ``response`` field.

The ``/api/generate`` endpoint (not ``/api/chat``) is the
Ollama-shaped endpoint documented in
``docs/ollama-text-spec.yml`` (the OpenAPI 3.1.0 spec for
Ollama's text surface). The ``ollama`` Python SDK exposes
``AsyncClient.generate(...)`` which targets ``/api/generate``;
the previous ``AsyncClient.chat(...)`` call targeted
``/api/chat`` which is NOT in the Ollama OpenAPI spec as of
0.1.0. The sprint mock (``epubtv.tools.mock_llm_service``) and
real Ollama daemons BOTH implement ``/api/generate``; the
change aligns the adapter with the spec + the mock so the
demo + tests work end-to-end against the documented surface.

The ``ollama.AsyncClient`` is the asynchronous counterpart of
``ollama.Client``; the FastAPI event loop is not blocked because the
``await`` releases the loop while the SDK waits on the socket. The
per-chunk ``asyncio.wait_for(60)`` envelope from plan 02-02's
XLATE-03 contract is still applied at the workflow service layer
(60s timeout + 1 retry + ``provider_timeout`` envelope).

The ``source_language`` + ``chunk_id`` parameters are accepted for
``TranslationPort`` Protocol parity but are NOT posted to Ollama
(Ollama's generate endpoint does not carry either). The ``api_key``
parameter is NOT supported (Ollama is a local daemon that does not
authenticate; the constructor is intentionally narrow so a
production wiring that accidentally tries to pass a key fails loud
at construction time rather than silently ignoring it).

The base class's trailing-slash guard is preserved (it runs in the
base ``__init__``).
"""

from __future__ import annotations

import ollama

from epubtv.adapters.translation.http_translation_adapter import (
    HttpTranslationAdapter,
)


class OllamaHttpTranslationAdapter(HttpTranslationAdapter):
    """Async Ollama translation provider (TRAN-02).

    Uses ``ollama.AsyncClient(host=base_url)`` + ``await
    client.generate(...)`` per ADR-0012 + plan 260711-1ww (the
    SDK's ``generate`` targets the spec-documented
    ``/api/generate`` endpoint, NOT the SDK's default
    ``/api/chat``). The ``aclose()`` method calls
    ``await self._ollama.aclose()`` to release the underlying
    ``httpx.AsyncClient`` the SDK owns.
    """

    def __init__(self, base_url: str, model: str) -> None:
        # Trailing-slash normalisation is preserved via the base class
        # ``__init__``; the ``ollama.AsyncClient`` below uses the same
        # normalised base URL so the wire round-trip is consistent.
        super().__init__(base_url=base_url, model=model)
        # The ``ollama.AsyncClient`` expects a host URL without a
        # trailing ``/v1`` suffix (Ollama's endpoints are at
        # ``/api/generate`` + ``/api/tags``, not under ``/v1``). We
        # strip a trailing ``/v1`` if the base URL ends with one
        # (the consolidated ``mock_llm`` service exposes both
        # shapes; the ``ollama`` Python client targets the native
        # Ollama shape).
        host = self._base_url.rstrip("/")
        if host.endswith("/v1"):
            host = host[: -len("/v1")]
        self._ollama = ollama.AsyncClient(host=host)

    async def translate(
        self,
        chunk_id: str,
        source_text: str,
        source_language: str | None,
        target_language: str,
    ) -> str:
        """Call ``await ollama.AsyncClient(host=...).generate(model=..., prompt=...)`` and return the response.

        The ``ollama`` Python client is awaited end-to-end — the
        FastAPI event loop is not blocked because the ``await``
        releases the loop while the SDK waits on the socket. The
        per-chunk ``asyncio.wait_for(60)`` envelope is still applied
        at the workflow service layer (XLATE-03 — 60s timeout + 1
        retry + ``provider_timeout`` envelope).

        ``chunk_id`` + ``source_language`` are accepted for
        ``TranslationPort`` Protocol parity but are NOT posted to
        Ollama (Ollama's generate endpoint does not carry either).
        ``target_language`` is also not posted — Ollama's generate
        endpoint derives the response language from the model
        (the user picks the model on the SPA's "Load Models" page;
        plan 01-04 wires that surface).
        """
        _ = (chunk_id, source_language, target_language)  # Protocol parity only
        response = await self._ollama.generate(
            model=self._model,
            prompt=source_text,
        )
        # The ``ollama`` Python client returns a ``GenerateResponse``
        # typed object; the generated text is at ``response["response"]``.
        # We use ``[...]`` access because the typed ``GenerateResponse``
        # is a ``TypedDict``-like pydantic model (subscriptable; the
        # pydantic v2 model supports both attribute and item access).
        return response["response"]

    async def aclose(self) -> None:
        """Close the ``ollama.AsyncClient`` (async ``close()``).

        The SDK's async ``close()`` releases the underlying
        ``httpx.AsyncClient`` the SDK owns. Safe to call multiple
        times (the SDK's ``close()`` is idempotent — the second
        call is a no-op when the client is already closed).
        """
        await self._ollama.close()


__all__ = ["OllamaHttpTranslationAdapter"]
