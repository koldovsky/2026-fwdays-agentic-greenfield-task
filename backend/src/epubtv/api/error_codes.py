"""Custom error code constants for the FastAPI app.

Per CONTEXT.md §Error codes — these are the string values emitted in the
``{error:{code,message,details?}}`` envelope. The values are part of the
public API contract (consumed by tests + the SPA); changing a value
breaks every client that branches on the code.

- ``PHASE_NOT_YET_IMPLEMENTED``: ``HTTP 501`` — ``job_type`` of
  ``voiceover`` or ``translation+voiceover`` is wired in the schema
  (D-05 verbatim storage) but the dispatcher raises 501 (Phase 3/4
  scope).
- ``SOURCE_LANGUAGE_REQUIRED``: ``HTTP 422`` — translation-family job
  was posted without ``source_language`` AND the EPUB declares 0
  ``dc:language`` values (D-06 missing case).
- ``PROVIDER_TIMEOUT``: ``HTTP 504`` — the 60s provider budget + 1
  retry both timed out (XLATE-03 + F3 60s scenario).
- ``VALIDATION_ERROR``: ``HTTP 422`` — generic Pydantic parse error
  (carried by the envelope handler for unmatched payloads; mirrors the
  Phase 1 ``HTTPException(422)`` mapping).

The corresponding HTTP status code is set by the router (NOT by this
module) so a code can map to multiple statuses if a future phase
re-shapes the surface.

Phase 1 plan 01: the runtime settings POST + rebind path is removed;
the corresponding error code is no longer needed.

Phase 1 plan 04 (BACK-03 + BACK-05): the provider model-list
endpoints (POST /api/v1/providers/{openai-compatible,ollama}/models)
return 502 ``provider_unreachable`` on a connection failure or
upstream auth failure; the SDK's error message is carried in the
envelope ``details.provider_error`` field.
"""

from __future__ import annotations

#: HTTP 501 — voiceover / combined job_type not implemented in Phase 2.
PHASE_NOT_YET_IMPLEMENTED: str = "phase_not_yet_implemented"

#: HTTP 422 — translation job with no source_language AND no EPUB-declared language.
SOURCE_LANGUAGE_REQUIRED: str = "source_language_required"

#: HTTP 504 — provider call exceeded 60s retry budget (XLATE-03 + F3).
PROVIDER_TIMEOUT: str = "provider_timeout"

#: HTTP 422 — generic Pydantic parse error / discriminated-union rejection.
VALIDATION_ERROR: str = "validation_error"

#: HTTP 409 — download requested for a job that is not in ``completed`` state.
JOB_NOT_COMPLETED: str = "job_not_completed"

#: HTTP 409 — ``DELETE /api/v1/jobs/{id}`` for a job in a terminal
#: state (``completed`` / ``failed`` / ``cancelled``). The cancel
#: surface only accepts non-terminal jobs (queued / running /
#: connecting); a DELETE on a finished row is a no-op rejection so
#: the SPA's "Cancel" button does not silently succeed on a
#: completed job. Quick 260710-oih.
JOB_NOT_CANCELLABLE: str = "job_not_cancellable"

#: HTTP 404 — download requested for an artifact kind not produced by the job type
#: (e.g. ZIP on a translation-only job, EPUB on a voiceover-only job), or the
#: artifact has not been pre-built yet (DL-04). Replaces the deferred
#: ``artifact_expired`` 410 envelope per CONTEXT.md D-04.
ARTIFACT_NOT_APPLICABLE: str = "artifact_not_applicable"

#: HTTP 502 — ``POST /api/v1/providers/{openai-compatible,ollama}/models``
#: could not reach the upstream provider (connection refused, timeout,
#: or upstream auth failure). The SDK's error message is carried in
#: ``details.provider_error`` (BACK-03 + BACK-05).
PROVIDER_UNREACHABLE: str = "provider_unreachable"

__all__ = [
    "ARTIFACT_NOT_APPLICABLE",
    "JOB_NOT_CANCELLABLE",
    "JOB_NOT_COMPLETED",
    "PHASE_NOT_YET_IMPLEMENTED",
    "PROVIDER_TIMEOUT",
    "PROVIDER_UNREACHABLE",
    "SOURCE_LANGUAGE_REQUIRED",
    "VALIDATION_ERROR",
]
