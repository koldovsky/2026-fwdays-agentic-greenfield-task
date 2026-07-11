# Use FastAPI as the backend API framework

## Context and Problem Statement

The Python backend exposes a versioned REST + WebSocket API (`/api/v1/...`) for EPUB upload, job management, progress streaming, and artifact download. We need to choose the web framework that will host these endpoints and orchestrate the in-process worker. Which framework is the right fit?

## Considered Options

* Flask
* Starlette
* FastAPI

## Decision Outcome

Chosen option: "FastAPI", because it is preferred over Starlette and Flask for its high performance, automatic API documentation, and built-in data validation using Pydantic, making it particularly suitable for building modern APIs. Additionally, FastAPI supports asynchronous programming, allowing it to handle significantly more requests per second compared to Flask.

### Consequences

* Good, because automatic OpenAPI docs and Pydantic validation reduce boilerplate for the discriminated `job_type` request/response models.
* Good, because native async support fits the WebSocket progress streaming and concurrent provider calls.
* Bad, because FastAPI's async event loop constrains blocking library calls (e.g. some EPUB/audio processing) to thread pools, requiring care to avoid blocking the loop.
