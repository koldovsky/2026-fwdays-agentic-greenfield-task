# Use Python (with FastAPI) as the backend language

## Context and Problem Statement

The backend is an API consumer of AI providers (Ollama, OpenAI-compatible) and orchestrates translation, voice-over, and combined job workflows. We must choose between a Python-based backend and a TypeScript/Node-based backend. Which language is the right fit?

## Considered Options

* TypeScript (Node-based API)
* Python (with FastAPI, API clients for Ollama and OpenAI)

## Decision Outcome

Chosen option: "Python (with FastAPI, API clients for Ollama and OpenAI)", because Python dominates the AI ecosystem with a rich set of libraries and frameworks specifically designed for machine learning and data science, making it the preferred choice for AI API-consumer backends. While TypeScript excels in type safety and integration with web technologies, Python's extensive tooling and ease of rapid prototyping are significant advantages in AI development.

### Consequences

* Good, because direct access to mature NLP/TTS/EPUB libraries (ebooklib, BeautifulSoup4, NLTK/spaCy, pydub, Ollama client) shortens implementation.
* Good, because FastAPI provides async REST + WebSocket with strong typing via Pydantic.
* Bad, because sharing types between backend and frontend requires a separate contract step (no single-language full-stack).
