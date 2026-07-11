# Use uv for Python backend package management

## Context and Problem Statement

The backend is a new Python service that consumes AI provider APIs (Ollama, OpenAI-compatible). We need to pick a single tool for dependency management, virtual environments, and package building across local development and CI pipelines. Which one should we use?

## Considered Options

* pip (with venv)
* poetry
* hatch
* uv

## Decision Outcome

Chosen option: "uv", because it combines dependency management, virtual environments, and package building into a single tool, offering significantly faster installation and dependency resolution than pip, hatch, and poetry. It adheres strictly to Python packaging standards, making it a streamlined choice for new projects and CI pipelines.

### Consequences

* Good, because toolchain is unified and install/resolve is materially faster in CI.
* Good, because strict PEP 621 / Standards-based packaging reduces lock drift.
* Bad, because it is a newer tool, so some ecosystem integrations and IDE defaults still assume pip/poetry.
