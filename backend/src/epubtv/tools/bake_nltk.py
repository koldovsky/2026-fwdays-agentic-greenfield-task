"""NLTK ``punkt_tab`` lazy-download bake (D-01 + Pitfall 1).

Bakes the NLTK tokenizer data package (``punkt_tab``) so the
``SentenceChunker`` can tokenize the 19 bundled languages at
runtime. ``PunktTokenizer`` imports from ``punkt_tab``; the legacy
``punkt`` package is marked deprecated by NLTK and is NOT installed.

Idempotent: the download is guarded by ``nltk.data.find`` so calling
``bake()`` in an already-baked environment is a no-op. CI uses
``python -m epubtv.tools.bake_nltk`` to warm the GitHub Actions cache
keyed on the punkt_tab pickle hash.

The chunker module imports ``bake`` at import time so any first
``SentenceChunker.chunk(...)`` call in a fresh container triggers the
download (D-01 + Open Q 10). The ``EPUBTV_BAKE_NLTK=1`` env knob
controls whether the module-import side effect runs; tests run with
the knob OFF so unit tests do NOT trigger a download (TESTING.md).
"""

from __future__ import annotations

import nltk


def bake() -> None:
    """Idempotent: download ``punkt_tab`` if not present.

    Returns ``None`` on success. The package is guarded by
    ``nltk.data.find`` so a second call in a fresh process is a no-op
    (no exception, no re-download).
    """
    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)
    return None


if __name__ == "__main__":
    bake()
