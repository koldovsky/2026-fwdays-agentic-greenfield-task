from askdocs.sources import LocalMarkdownSource


def test_discovers_md_recursively_with_relative_paths(tmp_path):
    (tmp_path / "a.md").write_text("# A", encoding="utf-8")
    (tmp_path / "sub").mkdir()
    (tmp_path / "sub" / "b.md").write_text("# B", encoding="utf-8")
    (tmp_path / "sub" / "ignored.txt").write_text("не markdown", encoding="utf-8")

    docs = LocalMarkdownSource(tmp_path).documents()

    assert [d.source_path for d in docs] == ["a.md", "sub/b.md"]
    assert docs[1].text == "# B"


def test_empty_corpus_yields_no_documents(tmp_path):
    assert LocalMarkdownSource(tmp_path).documents() == []
