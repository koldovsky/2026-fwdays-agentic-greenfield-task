"""Providers router unit tests (Phase 1 plan 01-01 → plan 01-04).

The three legacy canned-list endpoints (POST
``/api/v1/providers/openai-compatible/validate``, GET
``/api/v1/providers/ollama/models``, GET
``/api/v1/providers/v1/models``) are removed in plan 01-01. Plan
01-04 populates the new POST-shaped
``/api/v1/providers/{openai-compatible,ollama}/models`` endpoints
in the same router (BACK-03 + BACK-05).

This placeholder asserts the legacy endpoints are NOT registered
(so a regression that re-introduces them is caught) AND the new
POST endpoints ARE registered. The detailed test cases for the
new endpoints live in ``test_providers_router_ollama.py`` (4 cases)
+ ``test_providers_router_openai.py`` (4 cases); this file is the
slim surface check that the router wires the two POST routes
under the right paths.

The ``tcid JOBS-02-UT17`` marker is dropped here; the
``BACK-05-UT27`` + ``BACK-03-UT28`` markers on the new test
files claim the new tcid family.
"""

from __future__ import annotations

from typing import Any

import pytest

from epubtv.api.routers.providers import router

pytestmark = pytest.mark.asyncio


async def test_providers_router_has_no_legacy_routes(app: Any, db_path: Any) -> None:
    """The three legacy endpoints are NOT registered.

    Plan 01-01 removed the canned-list endpoints; plan 01-04
    populates the new POST-shaped endpoints in the same router
    under the same paths (``/ollama/models`` +
    ``/openai-compatible/models``). The legacy
    ``/v1/models`` + ``/openai-compatible/validate`` paths are
    NOT re-introduced.
    """
    paths = {route.path for route in router.routes}
    assert "/providers/openai-compatible/validate" not in paths
    assert "/providers/v1/models" not in paths


async def test_providers_router_registers_new_post_endpoints(app: Any, db_path: Any) -> None:
    """The two new POST endpoints are registered under the canonical paths.

    Plan 01-04 wires ``POST /api/v1/providers/openai-compatible/models``
    + ``POST /api/v1/providers/ollama/models`` (BACK-03 + BACK-05).
    """
    paths = {route.path for route in router.routes}
    assert "/providers/openai-compatible/models" in paths
    assert "/providers/ollama/models" in paths
