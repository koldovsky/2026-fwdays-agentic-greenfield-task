"""Integration tests: real qdrant service, clean collection per test."""

from pathlib import Path

from askdocs.ingest import ingest
from askdocs.sources import LocalMarkdownSource

CORPUS_DIR = Path(__file__).parent / "corpus"


def _snapshot(store):
    return {point_id: payload for point_id, payload in store.get_all()}


def test_ingest_fixture_corpus_stores_chunks_with_metadata(clean_store, embedder):
    total = ingest(LocalMarkdownSource(CORPUS_DIR), embedder, clean_store)

    assert total > 0
    assert clean_store.count() == total

    payloads = [p for _, p in clean_store.get_all()]
    sources = {p["source_path"] for p in payloads}
    # subset check so the corpus can grow (eval) without breaking this test
    assert {
        "README.md",
        "bezpeka.md",
        "dvyhun/palyvo.md",
        "dvyhun/kalibruvannya.md",
    } <= sources
    assert "notatky.txt" not in sources  # non-.md files are ignored
    for payload in payloads:
        assert isinstance(payload["chunk_index"], int)
        assert payload["heading"]  # heading trail present
        assert payload["content_hash"]
        assert payload["text"]

    trails = {p["heading"] for p in payloads}
    assert "Паливна система > Сорти гущі" in trails


def test_ingest_empty_corpus(clean_store, embedder, tmp_path):
    assert ingest(LocalMarkdownSource(tmp_path), embedder, clean_store) == 0
    assert clean_store.count() == 0


def test_reingest_is_idempotent(clean_store, embedder):
    source = LocalMarkdownSource(CORPUS_DIR)

    first_total = ingest(source, embedder, clean_store)
    first = _snapshot(clean_store)

    second_total = ingest(source, embedder, clean_store)
    second = _snapshot(clean_store)

    assert first_total == second_total
    assert clean_store.count() == first_total
    assert second == first  # same ids, same payloads, no duplicates


def test_shrunk_file_leaves_no_stale_chunks(clean_store, embedder, tmp_path):
    paragraphs = "\n\n".join(
        "Абзац {i}. ".format(i=i) + ("гуща " * 80).strip() for i in range(6)
    )
    doc = tmp_path / "rozdil.md"
    doc.write_text(f"# Розділ\n\n{paragraphs}\n\n## Підрозділ\n\nхвіст\n", encoding="utf-8")

    ingest(LocalMarkdownSource(tmp_path), embedder, clean_store)
    assert clean_store.count() > 1

    doc.write_text("# Розділ\n\nєдиний короткий абзац\n", encoding="utf-8")
    ingest(LocalMarkdownSource(tmp_path), embedder, clean_store)

    remaining = _snapshot(clean_store)
    assert len(remaining) == 1
    payload = next(iter(remaining.values()))
    assert payload["source_path"] == "rozdil.md"
    assert "єдиний короткий абзац" in payload["text"]
