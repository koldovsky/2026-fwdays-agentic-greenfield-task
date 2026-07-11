"""Generate the canonical 20-tag chapter fixture.

Produces ``tests/fixtures/chapters/structural_tags_20.html``: a chapter
with EXACTLY 20 canonical structural tags from the set
``{p, h1-h6, ul, ol, li, em, strong, a}`` per api-contract.md line 49.
The fixture drives the F3 ≥95% threshold regressions (D-07 +
``MockTranslatorDropsNthTag``): with 20 tags, the threshold lands on
``n=1`` (95% = 19 preserved, accepted) and ``n=2`` (90% = 18 preserved,
rejected).

Tag count breakdown (per unit test assertion below):
- 4 ``<p>`` (= 4)
- 1 ``<h1>``, 1 ``<h2>``, 1 ``<h3>``, 1 ``<h4>``, 1 ``<h5>``, 1 ``<h6>`` (= 6)
- 1 ``<ul>`` with 3 ``<li>`` (= 1 + 3 = 4)
- 1 ``<ol>`` with 2 ``<li>`` (= 1 + 2 = 3)
- 1 ``<em>``, 1 ``<strong>``, 1 ``<a>`` (= 3)
- TOTAL = 4 + 6 + 4 + 3 + 3 = 20.
"""

from __future__ import annotations

import sys
from pathlib import Path


def build_chapter() -> str:
    """Return a chapter with exactly 20 canonical structural tags."""
    return (
        # 1 h1 + 1 h2 + 1 h3 + 1 h4 + 1 h5 + 1 h6 = 6
        "<h1>Chapter Title</h1>"
        "<h2>Section One</h2>"
        "<h3>Subsection</h3>"
        "<h4>Sub-subsection</h4>"
        "<h5>Note</h5>"
        "<h6>Footnote</h6>"
        # 2 p = 2 (running total 8)
        "<p>First paragraph of the chapter.</p>"
        "<p>Second paragraph with <em>emphasis</em>.</p>"
        # 1 ul + 3 li = 4 (running total 12)
        "<ul>"
        "<li>First list item</li>"
        "<li>Second list item</li>"
        "<li>Third list item</li>"
        "</ul>"
        # 1 ol + 2 li = 3 (running total 15)
        "<ol>"
        "<li>First ordered item</li>"
        "<li>Second ordered item</li>"
        "</ol>"
        # 1 p with <strong> + <a> = 1 + 2 inline = 3 (running total 18)
        "<p>Third paragraph with <strong>strong</strong> and "
        "<a href='https://example.org'>a link</a>.</p>"
        # 2 more p (the pad) = 2 (running total 20)
        "<p>Fourth paragraph closing the chapter.</p>"
    )


def main() -> None:
    out = Path(__file__).resolve().parent / "structural_tags_20.html"
    out.write_text(build_chapter(), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
    sys.exit(0)
