"""Structure-aware markdown chunking (PRD FR-002).

Documents are split along markdown block boundaries, never by a blind
character count. A section (blocks under one heading) is the default chunk;
oversized sections are split only between blocks, and an atomic block
(table, fenced code, list) larger than the budget stays whole.
"""

from dataclasses import dataclass

from markdown_it import MarkdownIt

CHUNK_SIZE_BUDGET = 1500  # soft target in characters, integrity wins over size

_OPEN_TYPES = {
    "paragraph_open",
    "table_open",
    "bullet_list_open",
    "ordered_list_open",
    "blockquote_open",
}
_LEAF_TYPES = {"fence", "code_block", "html_block", "hr"}


@dataclass(frozen=True)
class Chunk:
    source_path: str
    heading: str  # heading trail, e.g. "Двигун > Паливна система"
    chunk_index: int
    text: str


def _parse_blocks(text: str) -> list[tuple[str, int | None, str]]:
    """Return top-level blocks as (kind, heading_level, block_text)."""
    lines = text.split("\n")
    tokens = MarkdownIt("commonmark").enable("table").parse(text)
    blocks: list[tuple[str, int | None, str]] = []
    for tok in tokens:
        if tok.level != 0 or tok.map is None:
            continue
        start, end = tok.map
        if tok.type == "heading_open":
            blocks.append(("heading", int(tok.tag[1]), "\n".join(lines[start:end]).strip()))
        elif tok.type in _OPEN_TYPES or tok.type in _LEAF_TYPES:
            blocks.append(("block", None, "\n".join(lines[start:end]).rstrip()))
    return blocks


def _pack(block_texts: list[str], budget: int) -> list[str]:
    """Greedily join blocks up to the budget; never splits inside a block."""
    pieces: list[str] = []
    current: list[str] = []
    size = 0
    for block in block_texts:
        if current and size + len(block) > budget:
            pieces.append("\n\n".join(current))
            current, size = [], 0
        current.append(block)
        size += len(block)
    if current:
        pieces.append("\n\n".join(current))
    return [p for p in pieces if p.strip()]


def chunk_markdown(source_path: str, text: str, budget: int = CHUNK_SIZE_BUDGET) -> list[Chunk]:
    chunks: list[Chunk] = []
    trail: list[tuple[int, str]] = []  # (level, title)
    section: list[str] = []

    def flush() -> None:
        heading = " > ".join(title for _, title in trail)
        for piece in _pack(section, budget):
            chunks.append(Chunk(source_path, heading, len(chunks), piece))
        section.clear()

    for kind, level, block_text in _parse_blocks(text):
        if kind == "heading":
            flush()
            title = block_text.lstrip("#").strip()
            trail[:] = [t for t in trail if t[0] < level] + [(level, title)]
        section.append(block_text)
    flush()
    return chunks
