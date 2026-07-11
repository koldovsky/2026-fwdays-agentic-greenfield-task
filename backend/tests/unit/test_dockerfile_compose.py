"""DOCKER-01 — docker-compose.yml structural validity (Phase 1 plan 05).

The compose file declares the new `mock-llm` service alongside the
`backend` service (DOCKER-01). The `mock-llm` service uses the same
`build:` directive as `backend` and runs
`python -m epubtv.tools.mock_llm_service`. The `backend` service
declares a `depends_on: { mock-llm: { condition: service_healthy } }`
gate so the backend only starts once the mock-llm healthcheck is
green. Per WR-06 the per-provider split is wired via two env vars
on the `backend` service: ``EPUBTV_DEFAULT_OLLAMA_URL`` and
``EPUBTV_DEFAULT_OPENAI_URL``, both defaulting to
``http://mock-llm:8765/v1`` (the in-network URL). The legacy
single ``MOCK_LLM_URL`` env var was removed; the per-provider
split lets the OpenAI-compatible adapter point at a different
upstream than the Ollama adapter without one URL shadowing the
other.

The retired `MOCK_TRANSLATOR_BEHAVIOUR` + `MOCK_TTS_BEHAVIOUR` env vars
(per-chunk failure-mode injection for the in-process mock adapters)
were dropped from the `backend` service's `environment:` block in
plan 01-05 Task 1 step 5: the in-process `MockTranslationAdapter` +
`MockTTSAdapter` moved to test-only fixtures in plan 01-02 Task 1;
the production failure-injection seam is dead (the
`tests/unit/_behaviour/test_behaviour_spec.py` module owns it per
plan 01-02 Task 1).

tcid: DOCKER-01-UT29
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

# Repo-root docker-compose.yml — resolved relative to this test file
# (backend/tests/unit/test_dockerfile_compose.py → 3 parents up).
REPO_ROOT = Path(__file__).parent.parent.parent.parent
COMPOSE_PATH = REPO_ROOT / "docker-compose.yml"


@pytest.fixture(scope="module")
def compose_doc() -> dict[str, object]:
    """PyYAML safe_load of the repo-root docker-compose.yml.

    The whole module shares the parsed document (one I/O read per
    test run; the file is small and stable).
    """
    assert COMPOSE_PATH.is_file(), f"docker-compose.yml not found at {COMPOSE_PATH}"
    with COMPOSE_PATH.open("r", encoding="utf-8") as fp:
        doc = yaml.safe_load(fp)
    assert isinstance(doc, dict), "compose root must be a mapping"
    return doc


def test_docker_compose_yaml_parses(compose_doc: dict[str, object]) -> None:
    """PyYAML structural check: mock-llm service + per-provider URLs wired.

    Asserts:
    - `services.mock-llm.command` starts with `python -m epubtv.tools.mock_llm_service`
    - `services.backend.environment.EPUBTV_DEFAULT_OLLAMA_URL == http://mock-llm:8765/v1`
    - `services.backend.environment.EPUBTV_DEFAULT_OPENAI_URL == http://mock-llm:8765/v1`
    - The retired `MOCK_LLM_URL` env var is NOT present on the
      `backend` service (per WR-06 the per-provider split replaces it).
    """
    services = compose_doc["services"]
    assert isinstance(services, dict)
    assert "mock-llm" in services, "mock-llm service is missing"
    mock_llm = services["mock-llm"]
    assert isinstance(mock_llm, dict)
    # The command is a YAML list of strings; join for substring check.
    cmd = mock_llm.get("command")
    assert isinstance(cmd, list)
    cmd_str = " ".join(cmd)
    assert "epubtv.tools.mock_llm_service" in cmd_str, (
        f"command must invoke epubtv.tools.mock_llm_service: {cmd}"
    )
    backend = services["backend"]
    assert isinstance(backend, dict)
    env = backend.get("environment")
    assert isinstance(env, dict)
    # Per WR-06 the per-provider URL split replaces the legacy
    # ``MOCK_LLM_URL``; the Ollama adapter reads
    # ``EPUBTV_DEFAULT_OLLAMA_URL`` (Ollama's native base path is
    # ``http://host/`` — no ``/v1`` suffix) and the OpenAI-compatible
    # adapter reads ``EPUBTV_DEFAULT_OPENAI_URL`` (the OpenAI wire
    # path is ``http://host/v1``).
    assert env.get("EPUBTV_DEFAULT_OLLAMA_URL") == "http://mock-llm:8765/", (
        f"backend.EPUBTV_DEFAULT_OLLAMA_URL mismatch: {env.get('EPUBTV_DEFAULT_OLLAMA_URL')!r}"
    )
    assert env.get("EPUBTV_DEFAULT_OPENAI_URL") == "http://mock-llm:8765/v1", (
        f"backend.EPUBTV_DEFAULT_OPENAI_URL mismatch: {env.get('EPUBTV_DEFAULT_OPENAI_URL')!r}"
    )
    # The retired ``MOCK_LLM_URL`` env var must NOT be present.
    assert "MOCK_LLM_URL" not in env, (
        "MOCK_LLM_URL must be dropped (per WR-06 the per-provider "
        "EPUBTV_DEFAULT_OLLAMA_URL + EPUBTV_DEFAULT_OPENAI_URL env vars "
        "replace the single URL surface)"
    )


def test_docker_compose_backend_depends_on_mock_llm(compose_doc: dict[str, object]) -> None:
    """The `backend` service declares `depends_on.mock-llm.condition == service_healthy`.

    The gate is what stops the backend from starting until the
    mock-llm `/healthz` probe is green (DOCKER-01).
    """
    services = compose_doc["services"]
    assert isinstance(services, dict)
    backend = services["backend"]
    assert isinstance(backend, dict)
    depends_on = backend.get("depends_on")
    assert depends_on is not None, "backend.depends_on is missing"
    assert isinstance(depends_on, dict)
    mock_dep = depends_on.get("mock-llm")
    assert mock_dep is not None, "backend.depends_on.mock-llm is missing"
    assert isinstance(mock_dep, dict)
    assert mock_dep.get("condition") == "service_healthy", (
        f"expected service_healthy, got {mock_dep.get('condition')!r}"
    )


def test_docker_compose_drops_orphaned_behaviour_env_vars(
    compose_doc: dict[str, object],
) -> None:
    """The retired `MOCK_TRANSLATOR_BEHAVIOUR` + `MOCK_TTS_BEHAVIOUR` env vars are absent.

    Per plan 01-05 Task 1 step 5, the per-chunk failure-injection
    env vars were dropped from the `backend` service's `environment:`
    block. The in-process `MockTranslationAdapter` + `MockTTSAdapter`
    moved to test-only fixtures in plan 01-02 Task 1; the production
    failure-injection seam is dead.
    """
    services = compose_doc["services"]
    assert isinstance(services, dict)
    backend = services["backend"]
    assert isinstance(backend, dict)
    env = backend.get("environment")
    assert isinstance(env, dict)
    assert "MOCK_TRANSLATOR_BEHAVIOUR" not in env, (
        "MOCK_TRANSLATOR_BEHAVIOUR must be dropped (in-process mocks moved to test code)"
    )
    assert "MOCK_TTS_BEHAVIOUR" not in env, (
        "MOCK_TTS_BEHAVIOUR must be dropped (in-process mocks moved to test code)"
    )


def test_docker_compose_config_runs() -> None:
    """`docker compose -f <path> config` exits 0 (optional smoke check).

    Skipped if `docker` is not on PATH (CI runners without the
    docker CLI). This is a developer-machine smoke check, NOT a CI
    gate; the PyYAML structural check above is the structural
    contract.
    """
    docker = shutil.which("docker")
    if docker is None:
        pytest.skip("docker CLI not available on this runner")
    result = subprocess.run(
        [docker, "compose", "-f", str(COMPOSE_PATH), "config"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, (
        f"docker compose config failed (rc={result.returncode}):\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )


def test_docker_compose_mock_llm_healthcheck_targets_loopback() -> None:
    """The mock-llm healthcheck polls `http://127.0.0.1:8765/healthz`.

    The healthcheck must target the loopback inside the container
    (the mock binds 0.0.0.0 inside the container; the healthcheck
    uses 127.0.0.1 — the mock-llm `expose: ["8765"]` only
    publishes the port inside the compose network, so the
    healthcheck cannot use the in-network DNS name from inside
    the container). The `/healthz` path matches the liveness
    route the `mock_llm_service` exposes.
    """
    with COMPOSE_PATH.open("r", encoding="utf-8") as fp:
        doc = yaml.safe_load(fp)
    services = doc["services"]
    mock_llm = services["mock-llm"]
    healthcheck = mock_llm["healthcheck"]
    test_cmd = healthcheck["test"]
    assert isinstance(test_cmd, list)
    cmd_str = " ".join(test_cmd)
    assert "127.0.0.1:8765" in cmd_str, f"healthcheck must use 127.0.0.1:8765: {cmd_str}"
    assert "/healthz" in cmd_str, f"healthcheck must target /healthz: {cmd_str}"
