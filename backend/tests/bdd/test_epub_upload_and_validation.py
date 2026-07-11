"""F1 pytest-bdd bindings — 6 @api + 3 @integration = 9 non-web scenarios.

The F1 feature file (symlinked from ``docs/features/``) carries 18
scenarios; Plan 03 binds the 9 @web scenarios via Playwright. This file
binds the 9 non-web scenarios (6 @api + 3 @integration) using explicit
``@scenario`` decorators — the alternative (a blanket ``scenarios(...)``
call) would auto-bind ALL 18, including @web steps that have no Python
step definition (e.g. ``Given the Language Learner has the platform
open in a browser``), causing ``StepDefinitionNotFoundError`` at
collection time.

Step definitions are grouped below the ``@scenario`` decorators. Each
step's wording must match the Gherkin step verbatim; pytest-bdd
8.1.0 + gherkin-official parses the ``Rule:`` keyword transparently —
the feature's rules are flattened into the top-level scenarios list, so
``@scenario("...", "<name>")`` matches by name regardless of which
``Rule:`` the scenario sits under.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import httpx
import pytest
from pytest_bdd import given, parsers, scenario, then, when

# ---------------------------------------------------------------------------
# Scenario bindings — 6 @api + 3 @integration = 9 non-web scenarios.
# ---------------------------------------------------------------------------
#
# Each ``@pytest.mark.tcid("...")`` ABOVE the ``@scenario`` decorator
# is the source-code-level Test Case ID (D-07). The runtime marker
# (used by ``-m tcid`` selection, the D-08 log line, and the pytest
# report) is applied in ``tests/bdd/conftest.py::pytest_collection_modifyitems``
# because pytest-bdd's ``@scenario`` decorator strips Python markers
# from the wrapped function. The source-code marker + docstring are
# documentation; the conftest SCENARIO_TCID_MAP is the runtime source
# of truth. See ``docs/traceability/TEST-PLAN.md`` for the inventory.

FEATURE = "features/epub-upload-and-validation.feature"


@pytest.mark.tcid("EPUB-02-SC04")
@scenario(FEATURE, "Valid EPUB 3.0 archive passes format validation")
def test_valid_epub_3_passes_format_validation() -> None:
    """tcid: EPUB-02-SC04; Valid EPUB 3.0 archive passes format validation."""


@pytest.mark.tcid("EPUB-02-SC05")
@scenario(FEATURE, "Non-EPUB archive is rejected with an invalid_epub error")
def test_non_epub_archive_rejected() -> None:
    """tcid: EPUB-02-SC05; Non-EPUB archive is rejected with an invalid_epub error."""


@pytest.mark.tcid("EPUB-02-SC07")
@scenario(FEATURE, "Corrupted EPUB file that cannot be opened is rejected")
def test_corrupted_epub_rejected() -> None:
    """tcid: EPUB-02-SC07; Corrupted EPUB file that cannot be opened is rejected."""


@pytest.mark.tcid("EPUB-01-SC10")
@scenario(FEATURE, "Server rejects oversized upload with a file_too_large error")
def test_oversized_upload_rejected() -> None:
    """tcid: EPUB-01-SC10; Server rejects oversized upload with a file_too_large error."""


@pytest.mark.tcid("EPUB-02-SC12")
@scenario(FEATURE, "Metadata is extracted from a valid EPUB and returned to the chooser step")
def test_metadata_extraction() -> None:
    """tcid: EPUB-02-SC12; Metadata is extracted from a valid EPUB and returned to the chooser step."""


@pytest.mark.tcid("EPUB-02-SC14")
@scenario(FEATURE, "EPUB missing optional metadata still produces a valid response")
def test_anonymous_epub_valid_response() -> None:
    """tcid: EPUB-02-SC14; EPUB missing optional metadata still produces a valid response."""


@pytest.mark.tcid("EPUB-01-SC11")
@scenario(FEATURE, "Exactly 50 MB EPUB is accepted at the limit boundary")
def test_exactly_50mb_accepted() -> None:
    """tcid: EPUB-01-SC11; Exactly 50 MB EPUB is accepted at the limit boundary."""


@pytest.mark.tcid("EPUB-02-SC15")
@scenario(FEATURE, "Multi-language EPUB reports all declared languages")
def test_multi_language_declared() -> None:
    """tcid: EPUB-02-SC15; Multi-language EPUB reports all declared languages."""


@pytest.mark.tcid("EPUB-02-SC18")
@scenario(
    FEATURE, "Audiobook Producer uploads a chapter-rich EPUB and metadata reports many chapters"
)
def test_chapter_rich_epub_reports_many_chapters() -> None:
    """tcid: EPUB-02-SC18; Audiobook Producer uploads a chapter-rich EPUB and metadata reports many chapters."""


# ---------------------------------------------------------------------------
# Step definitions — shared across the 9 scenarios.
# ---------------------------------------------------------------------------

# A small dictionary of named fixture -> file name mapping, used by the
# "Given the uploaded file "<name>" is a valid EPUB 3.0 archive" steps.
# Each scenario that needs a fixture file just names it.
_FIXTURE_BY_NAME = {
    "mystere-nocturne.epub": "mystere-nocturne.epub",
    "fake.epub": "fake.epub",
    "broken.epub": "broken.epub",
    "huge-book.epub": "huge-book.epub",
    "limit-bound.epub": "limit-bound.epub",
    "anonymous.epub": "anonymous.epub",
    "bilingual-reader.epub": "bilingual-reader.epub",
    "long-series.epub": "long-series.epub",
}


@given(
    parsers.parse('the uploaded file "{filename}" is a valid EPUB 3.0 archive'),
    target_fixture="uploaded_file_bytes",
)
def _given_valid_epub(
    filename: str,
    fixtures_dir: Path,
) -> dict[str, Any]:
    """Load a real fixture from ``fixtures_dir`` for valid-EPUB scenarios."""
    return {
        "filename": filename,
        "bytes": (fixtures_dir / _FIXTURE_BY_NAME[filename]).read_bytes(),
    }


@given(
    parsers.parse(
        'the uploaded file "{filename}" is a ZIP archive that is not a valid EPUB 2.0/3.0 package'
    ),
    target_fixture="uploaded_file_bytes",
)
def _given_non_epub_zip(
    filename: str,
    fake_epub_bytes: bytes,
) -> dict[str, Any]:
    """A plain ZIP (not an EPUB) — the F1 "Non-EPUB archive" scenario."""
    return {"filename": filename, "bytes": fake_epub_bytes}


@given(
    parsers.parse(
        'the uploaded file "{filename}" has corrupted bytes preventing archive extraction'
    ),
    target_fixture="uploaded_file_bytes",
)
def _given_corrupted_bytes(
    filename: str,
    broken_epub_bytes: bytes,
) -> dict[str, Any]:
    """Random bytes for the F1 "Corrupted EPUB" scenario."""
    return {"filename": filename, "bytes": broken_epub_bytes}


@given(
    parsers.parse('the uploaded file "{filename}" is 65 MB'),
    target_fixture="uploaded_file_bytes",
)
def _given_65mb(
    filename: str,
    padded_65mb_bytes: bytes,
) -> dict[str, Any]:
    """A 65 MB padded EPUB — F1 size-limit scenario."""
    return {"filename": filename, "bytes": padded_65mb_bytes}


@given(
    parsers.parse('the uploaded file "{filename}" is exactly 50 MB'),
    target_fixture="uploaded_file_bytes",
)
def _given_50mb(
    filename: str,
    padded_50mb_bytes: bytes,
) -> dict[str, Any]:
    """An exactly 50 MB padded EPUB — F1 boundary scenario."""
    return {"filename": filename, "bytes": padded_50mb_bytes}


@given(
    parsers.parse('a valid EPUB "{filename}" has passed format and size validation'),
    target_fixture="uploaded_file_bytes",
)
def _given_validated_epub(
    filename: str,
    fixtures_dir: Path,
) -> dict[str, Any]:
    """A pre-validated valid EPUB for the metadata extraction scenario."""
    return {
        "filename": filename,
        "bytes": (fixtures_dir / _FIXTURE_BY_NAME[filename]).read_bytes(),
    }


@given(
    parsers.parse('a valid EPUB "{filename}" omits title and author metadata'),
    target_fixture="uploaded_file_bytes",
)
def _given_anonymous(
    filename: str,
    fixtures_dir: Path,
) -> dict[str, Any]:
    """The ``anonymous.epub`` fixture — no title, no author."""
    return {
        "filename": filename,
        "bytes": (fixtures_dir / _FIXTURE_BY_NAME[filename]).read_bytes(),
    }


@given(
    parsers.parse('the valid EPUB "{filename}" declares languages "fr" and "en"'),
    target_fixture="uploaded_file_bytes",
)
def _given_bilingual(
    filename: str,
    fixtures_dir: Path,
) -> dict[str, Any]:
    """The ``bilingual-reader.epub`` fixture — declares fr + en."""
    return {
        "filename": filename,
        "bytes": (fixtures_dir / _FIXTURE_BY_NAME[filename]).read_bytes(),
    }


@given(
    parsers.parse(
        'an Audiobook Producer has chosen a valid EPUB "{filename}" containing 120 chapters'
    ),
    target_fixture="uploaded_file_bytes",
)
def _given_long_series(
    filename: str,
    fixtures_dir: Path,
) -> dict[str, Any]:
    """The ``long-series.epub`` fixture — 120 chapters."""
    return {
        "filename": filename,
        "bytes": (fixtures_dir / _FIXTURE_BY_NAME[filename]).read_bytes(),
    }


# ---- When ----------------------------------------------------------------


@when("the validation service validates the uploaded file", target_fixture="validation_response")
def _when_validation_service(
    client: httpx.AsyncClient,
    uploaded_file_bytes: dict[str, Any],
) -> httpx.Response:
    """POST the uploaded file to ``/api/v1/epubs`` and capture the response."""
    files = {
        "file": (
            uploaded_file_bytes["filename"],
            io.BytesIO(uploaded_file_bytes["bytes"]),
            "application/octet-stream",
        )
    }
    return client.post("/api/v1/epubs", files=files)  # type: ignore[return-value]


@when("the size-check step validates the file size", target_fixture="validation_response")
def _when_size_check(
    client: httpx.AsyncClient,
    uploaded_file_bytes: dict[str, Any],
) -> httpx.Response:
    """Same as the validation step from the F1 route's perspective — the
    size check is the first thing the route does after Content-Length."""
    files = {
        "file": (
            uploaded_file_bytes["filename"],
            io.BytesIO(uploaded_file_bytes["bytes"]),
            "application/octet-stream",
        )
    }
    return client.post("/api/v1/epubs", files=files)  # type: ignore[return-value]


@when(
    "the extraction service extracts metadata from the EPUB", target_fixture="validation_response"
)
def _when_extraction(
    client: httpx.AsyncClient,
    uploaded_file_bytes: dict[str, Any],
) -> httpx.Response:
    """Metadata extraction is the F1 endpoint's whole purpose — same POST."""
    files = {
        "file": (
            uploaded_file_bytes["filename"],
            io.BytesIO(uploaded_file_bytes["bytes"]),
            "application/octet-stream",
        )
    }
    return client.post("/api/v1/epubs", files=files)  # type: ignore[return-value]


# ---- Then ----------------------------------------------------------------


@then("the response has HTTP status 200 and no validation error is reported")
def _then_status_200_no_error(validation_response: httpx.Response) -> None:
    assert validation_response.status_code == 200, validation_response.text
    body = validation_response.json()
    assert "error" not in body, f"unexpected error: {body!r}"


@then(
    parsers.parse('the response has HTTP status 422 with error.code equal to "{code}"'),
)
def _then_422_invalid_epub(validation_response: httpx.Response, code: str) -> None:
    assert validation_response.status_code == 422, validation_response.text
    body = validation_response.json()
    assert body["error"]["code"] == code, body


@then(
    parsers.parse('the response has HTTP status 413 with error.code equal to "{code}"'),
)
def _then_413_file_too_large(validation_response: httpx.Response, code: str) -> None:
    assert validation_response.status_code == 413, validation_response.text
    body = validation_response.json()
    assert body["error"]["code"] == code, body


@then("the response has HTTP status 200 and the file is accepted for validation")
def _then_status_200(validation_response: httpx.Response) -> None:
    assert validation_response.status_code == 200, validation_response.text
    body = validation_response.json()
    assert "error" not in body, f"unexpected error: {body!r}"


@then(
    parsers.parse('the response includes the fields "{a}", "{b}", "{c}", and "{d}"'),
)
def _then_includes_fields(
    validation_response: httpx.Response,
    a: str,
    b: str,
    c: str,
    d: str,
) -> None:
    body = validation_response.json()
    for field in (a, b, c, d):
        assert field in body, f"missing field {field!r} in {body!r}"


@then(
    'the response has HTTP status 200 and the "title" and "author" fields are empty while "chapter_count" returns a numeric value',
)
def _then_anonymous_fields(validation_response: httpx.Response) -> None:
    assert validation_response.status_code == 200, validation_response.text
    body = validation_response.json()
    assert body.get("title") in (None, ""), f"expected empty title, got {body.get('title')!r}"
    assert body.get("author") in (None, ""), f"expected empty author, got {body.get('author')!r}"
    assert isinstance(body.get("chapter_count"), int), (
        f"expected numeric chapter_count, got {body.get('chapter_count')!r}"
    )
    assert body["chapter_count"] > 0


@then(
    parsers.parse('the response field "declared_languages" contains both "{a}" and "{b}"'),
)
def _then_declared_languages_contain(validation_response: httpx.Response, a: str, b: str) -> None:
    body = validation_response.json()
    langs = set(body.get("declared_languages", []))
    assert a in langs, f"{a!r} not in declared_languages {langs!r}"
    assert b in langs, f"{b!r} not in declared_languages {langs!r}"


@then(
    'the "chapter_count" field equals 120 and the file is accepted for further processing',
)
def _then_chapter_count_120(validation_response: httpx.Response) -> None:
    assert validation_response.status_code == 200, validation_response.text
    body = validation_response.json()
    assert body["chapter_count"] == 120, body
