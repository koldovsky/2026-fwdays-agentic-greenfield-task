"""DocSource interface and the v1 local markdown implementation."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Document:
    source_path: str  # relative to the corpus root, posix-style
    text: str


class DocSource(ABC):
    """Interface: "give me the documents"."""

    @abstractmethod
    def documents(self) -> list[Document]: ...


class LocalMarkdownSource(DocSource):
    """Recursively reads all .md files under a corpus directory."""

    def __init__(self, root: Path | str):
        self._root = Path(root)

    def documents(self) -> list[Document]:
        return [
            Document(
                source_path=path.relative_to(self._root).as_posix(),
                text=path.read_text(encoding="utf-8"),
            )
            for path in sorted(self._root.rglob("*.md"))
            if path.is_file()
        ]
