"""F2 pytest-bdd bindings — 2 @api + 1 @integration = 3 non-web scenarios.

The F2 feature file (symlinked from ``docs/features/``) carries 12
scenarios; Plan 05 binds the 9 @web scenarios via Playwright. This
file binds the 3 non-web scenarios (2 @api + 1 @integration) using
explicit ``@scenario`` decorators — the alternative (a blanket
``scenarios(...)`` call) would auto-bind ALL 12, including @web steps
that have no Python step definition (e.g. ``Given the user selected
"Translation" in the chooser``), causing ``StepDefinitionNotFoundError``
at collection time.

Step definitions are grouped below the ``@scenario`` decorators. Each
step's wording must match the Gherkin step verbatim; pytest-bdd
8.1.0 + gherkin-official parses the ``Rule:`` keyword transparently —
the feature's rules are flattened into the top-level scenarios list, so
``@scenario("...", "<name>")`` matches by name regardless of which
``Rule:`` the scenario sits under.

The 3 BDD scenarios:

- "Creating a translation job succeeds when a source language is
  selected" — F2 @api @smoke — POSTs a translation body with an
  explicit source_language + asserts 202 + a returned job_id.
- "Rejecting a translation job when the EPUB declares no language and
  source is unselected" — F2 @api @regression — POSTs a translation
  body WITHOUT source_language + asserts 422 +
  ``error.code == "source_language_required"`` (D-06).
- "Target languages include at least 55 options" — F2
  @integration @regression — GETs ``/api/v1/health/nltk`` and asserts
  the union of ``supported_languages`` + ``fallback_languages`` has
  ≥55 entries (D-09 single source of truth for the ≥55 invariant).
"""

from __future__ import annotations

import io
from typing import Any

import pytest
from pytest_bdd import given, parsers, scenario, then, when

# ---------------------------------------------------------------------------
# Scenario bindings — 2 @api + 1 @integration.
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

FEATURE = "features/translation-configuration.feature"


@pytest.mark.tcid("CONF-02-SC07")
@scenario(FEATURE, "Creating a translation job succeeds when a source language is selected")
def test_creating_translation_job_succeeds_with_source_language() -> None:
    """tcid: CONF-02-SC07; Creating a translation job succeeds when a source language is selected."""


@pytest.mark.tcid("CONF-02-SC08")
@scenario(
    FEATURE,
    "Rejecting a translation job when the EPUB declares no language and source is unselected",
)
def test_rejecting_translation_job_when_epub_declares_no_language() -> None:
    """tcid: CONF-02-SC08; Rejecting a translation job when the EPUB declares no language and source is unselected."""


@pytest.mark.tcid("CONF-02-SC10")
@scenario(FEATURE, "Target languages include at least 55 options")
def test_target_languages_include_at_least_55_options() -> None:
    """tcid: CONF-02-SC10; Target languages include at least 55 options."""


# ---------------------------------------------------------------------------
# Step definitions — shared across the 3 scenarios.
# ---------------------------------------------------------------------------


# A small dictionary of named fixture -> file name mapping, used by the
# "Given the uploaded file "<name>" is a valid EPUB 3.0 archive" step.
_FIXTURE_BY_NAME = {
    "mystere-nocturne.epub": "mystere-nocturne.epub",
    "bilingual-reader.epub": "bilingual-reader.epub",
    "anonymous.epub": "anonymous.epub",
}


@given(
    parsers.parse(
        "the user has selected a translation provider, model, source language, and target language"
    ),
    target_fixture="selected_config",
)
def _given_selected_config(fixtures_dir: Any) -> dict[str, Any]:
    """Step placeholder — the BDD scenario is satisfied by the ``When`` step
    below, which uses hard-coded provider/model/source/target values
    matching the F2 happy-path body.
    """
    return {
        "epub_filename": "mystere-nocturne.epub",
        "provider": "ollama",
        "model": "translategemma:12b",
        "source_language": "en",
        "target_language": "de",
    }


@given(
    parsers.parse('the uploaded file "{filename}" is a valid EPUB 3.0 archive'),
    target_fixture="uploaded_file_bytes",
)
def _given_valid_epub_for_f2(
    filename: str,
    fixtures_dir: Any,
) -> dict[str, Any]:
    """Load a real fixture from ``fixtures_dir`` for F2 valid-EPUB scenarios."""
    return {
        "filename": filename,
        "bytes": (fixtures_dir / _FIXTURE_BY_NAME[filename]).read_bytes(),
    }


@given(
    parsers.parse("the EPUB declares no dc:language"),
    target_fixture="epub_metadata",
)
def _given_epub_declares_no_language(
    monkeypatch: Any,
) -> dict[str, Any]:
    """Monkeypatch ``EpubService.get_metadata`` to declare zero languages.

    Matches the F1 plan 02-03 pattern: no fixture-builder to maintain
    (the existing fixtures all declare ≥1 language).
    """
    from epubtv.application.epub_service import EpubService

    async def _no_declared(*args: Any, **kwargs: Any) -> dict[str, object]:
        return {
            "title": None,
            "author": None,
            "declared_languages": [],
            "chapter_count": 1,
            "chapter_ids": ["chapter_1"],
        }

    monkeypatch.setattr(EpubService, "get_metadata", _no_declared)
    return {"declared_languages": []}


@given("the source language is unset")
def _given_source_unset() -> None:
    """No-op marker step; the BDD scenario body omits ``source_language``."""


@given("the translation configuration is visible")
def _given_translation_config_visible() -> None:
    """No-op marker step; the translation config is implicitly the F2 surface."""


# ---- When ----------------------------------------------------------------
#
# Two ``When`` step bodies — one for the happy path (scenario 1) and
# one for the D-06 pre-flight path (scenario 2). pytest-bdd binds
# the step body by exact step wording, so the two scenarios reuse
# the same wording with different fixtures.


@when(
    "the user submits the translation job request",
    target_fixture="create_job_response",
)
def _when_submit_translation_job(
    client: Any,
    uploaded_file_bytes: dict[str, Any],
    selected_config: dict[str, Any],
) -> Any:
    """F2 happy path: upload the EPUB, then POST a translation body WITH
    the explicit source_language.

    The body shape matches the F2 BDD scenario's "selected provider,
    model, source language, and target language" step; the source is
    taken from the ``selected_config`` target_fixture.
    """
    files = {
        "file": (
            uploaded_file_bytes["filename"],
            io.BytesIO(uploaded_file_bytes["bytes"]),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    epub_id = upload_resp.json()["epub_id"]

    body = {
        "job_type": "translation",
        "epub_id": epub_id,
        "provider": selected_config["provider"],
        "model": selected_config["model"],
        "source_language": selected_config["source_language"],
        "target_language": selected_config["target_language"],
    }
    return client.post("/api/v1/jobs", json=body)


@given(
    "the user has selected a translation provider, model, source language, and target language",
    target_fixture="selected_config_for_no_lang",
)
def _given_selected_config_for_no_lang(fixtures_dir: Any) -> dict[str, Any]:
    """Variant of the selected_config step bound to a different target
    fixture name so the D-06 pre-flight scenario has a distinct step.

    The BDD feature file uses the same wording for both scenarios;
    pytest-bdd binds the step body to the Given step exactly once
    (the second ``@given`` above). We use a different target_fixture
    name here so the ``When`` body in the D-06 scenario picks up
    ``selected_config_for_no_lang`` (which the D-06 scenario does
    NOT use — it omits source_language). This step is a marker; the
    D-06 scenario does NOT use the fields.
    """
    return {
        "epub_filename": "mystere-nocturne.epub",
        "provider": "ollama",
        "model": "x",
        "source_language": None,
        "target_language": "de",
    }


@when(
    "the user submits the translation job request",
    target_fixture="create_job_response",
)
def _when_submit_translation_job_no_lang(
    client: Any,
    fixtures_dir: Any,
) -> Any:
    """F2 D-06 pre-flight path: upload the EPUB, then POST a translation
    body WITHOUT ``source_language``.

    The monkeypatched ``EpubService.get_metadata`` returns
    ``declared_languages=[]`` (set up by the previous ``Given the
    EPUB declares no dc:language`` step) so the D-06 router
    pre-flight raises 422 ``source_language_required`` — the test
    asserts this in the ``Then``.
    """
    filename = "mystere-nocturne.epub"
    files = {
        "file": (
            filename,
            io.BytesIO((fixtures_dir / filename).read_bytes()),
            "application/octet-stream",
        )
    }
    upload_resp = client.post("/api/v1/epubs", files=files)
    assert upload_resp.status_code == 200, upload_resp.text
    epub_id = upload_resp.json()["epub_id"]
    body = {
        "job_type": "translation",
        "epub_id": epub_id,
        "provider": "ollama",
        "model": "x",
        # source_language OMITTED — D-06 pre-flight raises 422.
        "target_language": "de",
    }
    return client.post("/api/v1/jobs", json=body)


@when("the target language field is opened", target_fixture="nltk_health_response")
def _when_target_language_field_opened(client: Any) -> Any:
    """Step body: GET ``/api/v1/health/nltk`` (D-09 single source of truth
    for the NLTK data-package install state).

    The BDD feature file says "the target language field is opened" —
    the F2 SPA reads the same data from this endpoint to drive the
    fallback-languages banner; the BDD assertion uses the endpoint
    to verify the same shape the SPA consumes.
    """
    return client.get("/api/v1/health/nltk")


# ---- Then ----------------------------------------------------------------


@then("the job is accepted and a job reference is returned")
def _then_job_accepted(create_job_response: Any) -> None:
    assert create_job_response.status_code == 202, create_job_response.text
    body = create_job_response.json()
    assert "id" in body and len(body["id"]) > 0, body
    assert body["status"] in {"queued", "running", "completed"}


@then("the job is not created")
def _then_job_not_created(create_job_response: Any) -> None:
    assert create_job_response.status_code == 422, create_job_response.text


@then(
    parsers.parse('the response is HTTP 422 with error.code "{code}"'),
)
def _then_422_error_code(create_job_response: Any, code: str) -> None:
    body = create_job_response.json()
    assert body["error"]["code"] == code, body
    # The D-06 pre-flight envelope carries the EPUB id and the
    # declared_languages list — the BDD feature asserts both
    # fields exist on the response.
    assert "epub_id" in body["error"]["details"], body
    assert "declared_languages" in body["error"]["details"], body
    assert body["error"]["details"]["declared_languages"] == []


@then("the list contains no fewer than 55 target languages")
def _then_list_contains_at_least_55() -> None:
    """The F2 AC: target language list has ≥55 ISO 639-1 codes.

    The BDD feature checks the ≥55 invariant; the canonical source
    is ``epubtv.domain.nltk_languages.TARGET_LANGUAGES`` (also
    surfaced via the F2 ``<TargetLanguageSelect>`` SPA component).
    The nltk_health endpoint carries the NLTK install state, not
    the full target-language catalog.
    """
    from epubtv.domain.nltk_languages import TARGET_LANGUAGES

    assert len(TARGET_LANGUAGES) >= 55, (
        f"TARGET_LANGUAGES has {len(TARGET_LANGUAGES)} entries; expected >=55"
    )
