"""Continuous reconciliation of a mounted .md directory with the vector store.

Poll + diff, not inotify: bind-mount filesystem events are unreliable across
the host->container boundary, so a poll loop is the robust choice.

    docker compose run --rm app python -m askdocs.sync <corpus-dir>
"""

import math
import os
import sys
import time
from dataclasses import dataclass, field

from askdocs.chunking import chunk_markdown
from askdocs.embeddings import EmbeddingProvider
from askdocs.sources import DocSource
from askdocs.store import VectorStore, content_hash

DEFAULT_INTERVAL = 5.0
QDRANT_WAIT_TIMEOUT = 60.0


def _wait_for_qdrant(url: str, timeout: float = QDRANT_WAIT_TIMEOUT) -> None:
    """Block until qdrant answers — `docker compose up` starts both together."""
    from qdrant_client import QdrantClient

    deadline = time.monotonic() + timeout
    while True:
        client = None
        try:
            client = QdrantClient(url=url, timeout=5)
            client.get_collections()
            return
        except Exception:
            if time.monotonic() > deadline:
                raise
            time.sleep(1)
        finally:
            if client is not None:
                client.close()


@dataclass
class SyncSummary:
    added: list[str] = field(default_factory=list)
    updated: list[str] = field(default_factory=list)
    deleted: list[str] = field(default_factory=list)

    @property
    def changed(self) -> bool:
        return bool(self.added or self.updated or self.deleted)


def _store_hashes_by_source(store: VectorStore) -> dict[str, set[str]]:
    by_source: dict[str, set[str]] = {}
    for _, payload in store.get_all():
        by_source.setdefault(payload["source_path"], set()).add(payload["content_hash"])
    return by_source


def sync_once(source: DocSource, embedder: EmbeddingProvider, store: VectorStore) -> SyncSummary:
    """One reconciliation pass: make the store match the current disk state."""
    summary = SyncSummary()
    store_hashes = _store_hashes_by_source(store)
    disk_sources: set[str] = set()

    for doc in source.documents():
        disk_sources.add(doc.source_path)
        chunks = chunk_markdown(doc.source_path, doc.text)
        disk_hashes = {content_hash(c.text) for c in chunks}
        stored = store_hashes.get(doc.source_path)

        if stored == disk_hashes:
            continue  # unchanged — do not re-embed

        # new or changed: replace the file's chunks wholesale (idempotent)
        store.delete_by_source(doc.source_path)
        if chunks:
            store.upsert(chunks, embedder.embed([c.text for c in chunks]))
        (summary.added if stored is None else summary.updated).append(doc.source_path)

    for gone in store_hashes.keys() - disk_sources:
        store.delete_by_source(gone)
        summary.deleted.append(gone)

    return summary


def _parse_interval(raw: str | None) -> float:
    """Parse ASKDOCS_SYNC_INTERVAL, falling back to the default on bad input
    instead of crashing the watcher at startup."""
    if not raw:
        return DEFAULT_INTERVAL
    try:
        interval = float(raw)
    except ValueError:
        print(f"sync: некоректний ASKDOCS_SYNC_INTERVAL={raw!r}, беру {DEFAULT_INTERVAL}s", flush=True)
        return DEFAULT_INTERVAL
    # reject inf/nan too: nan <= 0 is False and inf > 0 is True, so a bare
    # `<= 0` check would let them through and make time.sleep() hang forever.
    if not math.isfinite(interval) or interval <= 0:
        print(f"sync: ASKDOCS_SYNC_INTERVAL={raw!r} має бути додатнім числом, беру {DEFAULT_INTERVAL}s", flush=True)
        return DEFAULT_INTERVAL
    return interval


def watch(
    source: DocSource,
    embedder: EmbeddingProvider,
    store: VectorStore,
    interval: float = DEFAULT_INTERVAL,
    max_iterations: int | None = None,
) -> None:
    """Reconcile on a timer. max_iterations bounds the loop for tests.

    A single failed pass (e.g. a transient vector-store blip) must not kill the
    watcher — it is logged and the loop continues, so sync stays continuous."""
    iteration = 0
    while max_iterations is None or iteration < max_iterations:
        try:
            summary = sync_once(source, embedder, store)
            if summary.changed:
                print(
                    f"sync: +{len(summary.added)} ~{len(summary.updated)} -{len(summary.deleted)}",
                    flush=True,
                )
        except Exception as e:  # noqa: BLE001 — keep the watcher alive across transient failures
            print(f"sync: пропуск проходу через помилку, повтор за {interval}s: {e}", flush=True)
        iteration += 1
        if max_iterations is not None and iteration >= max_iterations:
            break
        time.sleep(interval)


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    corpus = argv[0] if argv else os.environ.get("ASKDOCS_CORPUS", "/corpus")

    from askdocs.embeddings import SentenceTransformersProvider
    from askdocs.ingest import DEFAULT_COLLECTION
    from askdocs.sources import LocalMarkdownSource
    from askdocs.store import QdrantStore

    qdrant_url = os.environ.get("QDRANT_URL", "http://localhost:6333")
    _wait_for_qdrant(qdrant_url)
    embedder = SentenceTransformersProvider()
    store = QdrantStore(
        url=qdrant_url,
        collection=os.environ.get("ASKDOCS_COLLECTION", DEFAULT_COLLECTION),
        dimension=embedder.dimension,
    )
    interval = _parse_interval(os.environ.get("ASKDOCS_SYNC_INTERVAL"))
    print(f"askdocs sync: watching {corpus} every {interval}s", flush=True)
    watch(LocalMarkdownSource(corpus), embedder, store, interval=interval)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
