"""``HttpTranslationAdapter`` unit tests (TRAN-01, plan 01-02).

The base ``HttpTranslationAdapter`` is non-overridable per TRAN-01.
The ``model`` parameter has no default; ``translate(...)`` and
``aclose()`` both raise ``NotImplementedError``. The per-subclass
behaviour is covered in
``test_ollama_http_translation_adapter.py`` +
``test_openai_http_translation_adapter.py``.

Per IN-05 the base class no longer constructs an
``httpx.AsyncClient``; each subclass owns its own HTTP transport
(the ``ollama`` Python client for ``OllamaHttpTranslationAdapter``,
the ``openai.AsyncOpenAI`` SDK for ``OpenAIHttpTranslationAdapter``).
The base class only normalises the base URL and exposes
``_base_url`` + ``_model`` to subclasses.

Behaviours (locked by TRAN-01 + Pitfall 5 + plan 01-02 + IN-05):
- ``test_trailing_slash_guarded_on_init`` — ``__init__`` forces
  ``base_url`` to end with a single ``/`` regardless of input
  (Pitfall 5 — silent 307 redirect otherwise). The new contract
  REQUIRES the caller to pass ``model=`` explicitly (no default).
- ``test_model_parameter_has_no_default`` — instantiating the base
  class without ``model=...`` raises ``TypeError`` (loud failure).
- ``test_translate_raises_not_implemented_error`` — ``translate(...)``
  raises ``NotImplementedError`` with a class-qualified message
  (loud failure per backend/AGENTS.md §Mandatory gotchas).
- ``test_aclose_raises_not_implemented_error`` — ``aclose(...)`` on
  the base class raises ``NotImplementedError`` (IN-05 — the
  base class owns no HTTP client to close; subclasses MUST
  override).
"""

from __future__ import annotations

import asyncio

import pytest

from epubtv.adapters.translation.http_translation_adapter import HttpTranslationAdapter

pytestmark = pytest.mark.tcid("XLATE-01-UT10")


def test_trailing_slash_guarded_on_init() -> None:
    """``__init__`` forces a single trailing ``/`` on ``_base_url``.

    The new contract REQUIRES the caller to pass ``model=...`` (no
    default). The trailing-slash guard is preserved from the v1.1
    base class. Per IN-05 the base class no longer owns an
    ``httpx.AsyncClient``; ``_base_url`` is the only URL seam.
    """
    adapter = HttpTranslationAdapter(base_url="http://mock:8765", model="translategemma:12b")
    assert adapter._base_url == "http://mock:8765/"
    # already-trailing input does NOT become double-slashed
    adapter2 = HttpTranslationAdapter(base_url="http://mock:8765/", model="translategemma:12b")
    assert adapter2._base_url == "http://mock:8765/"
    assert not adapter2._base_url.endswith("//")


def test_model_parameter_has_no_default() -> None:
    """The ``model`` parameter has no default — instantiating without it raises ``TypeError``.

    Regression guard for TRAN-01: a caller that instantiates
    ``HttpTranslationAdapter(base_url=...)`` without ``model=...``
    must get a loud ``TypeError`` from the missing positional
    argument (the previous ``model: str = "translategemma:12b"``
    default was removed).
    """
    with pytest.raises(TypeError, match="model"):
        HttpTranslationAdapter(base_url="http://mock:8765")  # type: ignore[call-arg]


def test_translate_raises_not_implemented_error() -> None:
    """``translate(...)`` on the base class raises ``NotImplementedError`` with a class-qualified message.

    Regression guard for TRAN-01: the base class is non-overridable.
    A caller that accidentally instantiates the base class and calls
    ``translate(...)`` gets a loud failure with the message naming
    the two production subclasses that should be used instead.
    """
    adapter = HttpTranslationAdapter(base_url="http://mock:8765", model="translategemma:12b")

    async def run() -> str:
        return await adapter.translate(
            chunk_id="tx_ch1_s3",
            source_text="Hello",
            source_language="en",
            target_language="de",
        )

    with pytest.raises(NotImplementedError, match="HttpTranslationAdapter is a base class"):
        asyncio.run(run())


def test_aclose_raises_not_implemented_error() -> None:
    """``aclose(...)`` on the base class raises ``NotImplementedError`` (IN-05).

    Per IN-05 the base class owns no HTTP client to close; each
    subclass owns its own transport (the ``ollama`` Python client
    for ``OllamaHttpTranslationAdapter``, the ``openai.AsyncOpenAI``
    SDK for ``OpenAIHttpTranslationAdapter``). A caller that
    accidentally instantiates the base class and calls
    ``aclose()`` gets a loud ``NotImplementedError`` directing them
    to the subclass.
    """
    adapter = HttpTranslationAdapter(base_url="http://mock:8765", model="translategemma:12b")
    with pytest.raises(NotImplementedError, match="subclasses MUST override aclose"):
        asyncio.run(adapter.aclose())


def test_base_class_has_no_client_attribute() -> None:
    """The base class does NOT expose a ``_client`` attribute (IN-05).

    The httpx async client that used to live on the base class is
    gone — each subclass owns its own transport. A regression
    where the base class re-exposes ``_client`` would couple the
    adapter lifecycle back to the (removed) shared pool.
    """
    adapter = HttpTranslationAdapter(base_url="http://mock:8765", model="translategemma:12b")
    assert not hasattr(adapter, "_client")
