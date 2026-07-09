from askdocs.chunking import chunk_markdown

TABLE = (
    "| Сорт | Тяга |\n"
    "|---|---|\n"
    "| Арабіка | 3.4 |\n"
    "| Робуста | 1.2 |"
)

CODE = "```bash\nhushcal --rotors all\necho $?\n```"


def _long_paragraphs(n, size=400):
    return [f"Абзац {i}. " + ("гуща " * (size // 5)).strip() for i in range(n)]


def test_section_is_single_chunk_with_heading_trail():
    text = "# Двигун\n\nвступ\n\n## Паливна система\n\nдеталі про гущу"
    chunks = chunk_markdown("doc.md", text)

    assert [c.heading for c in chunks] == ["Двигун", "Двигун > Паливна система"]
    assert [c.chunk_index for c in chunks] == [0, 1]
    assert "деталі про гущу" in chunks[1].text


def test_table_never_split():
    paragraphs = _long_paragraphs(4)
    text = "# Сорти\n\n" + "\n\n".join(paragraphs[:2] + [TABLE] + paragraphs[2:])
    chunks = chunk_markdown("doc.md", text, budget=900)

    assert len(chunks) > 1
    containing = [c for c in chunks if TABLE in c.text]
    assert len(containing) == 1
    assert not any("| Арабіка" in c.text and TABLE not in c.text for c in chunks)


def test_code_block_never_split():
    paragraphs = _long_paragraphs(4)
    text = "# Калібрування\n\n" + "\n\n".join(paragraphs[:2] + [CODE] + paragraphs[2:])
    chunks = chunk_markdown("doc.md", text, budget=900)

    assert len(chunks) > 1
    containing = [c for c in chunks if CODE in c.text]
    assert len(containing) == 1


def test_oversized_section_splits_on_block_boundaries():
    paragraphs = _long_paragraphs(6)
    text = "# Регламент\n\n" + "\n\n".join(paragraphs)
    chunks = chunk_markdown("doc.md", text, budget=1000)

    assert len(chunks) > 1
    # every paragraph survives whole, in exactly one chunk
    for paragraph in paragraphs:
        assert sum(paragraph in c.text for c in chunks) == 1
    # chunks jointly cover the section
    combined = "\n\n".join(c.text for c in chunks)
    for paragraph in paragraphs:
        assert paragraph in combined


def test_atomic_block_larger_than_budget_stays_whole():
    huge_code = "```\n" + "\n".join(f"рядок {i}" for i in range(200)) + "\n```"
    text = "# Лог\n\n" + huge_code
    chunks = chunk_markdown("doc.md", text, budget=100)

    containing = [c for c in chunks if huge_code in c.text]
    assert len(containing) == 1
