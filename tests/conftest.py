import os
import time

import httpx
import pytest

QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
TEST_COLLECTION = "askdocs_test"


def llm_available() -> bool:
    """True when the configured LLM endpoint answers — used to skip live tests."""
    from askdocs.llm import DEFAULT_BASE_URL

    base_url = os.environ.get("LLM_BASE_URL", DEFAULT_BASE_URL).rstrip("/")
    try:
        return httpx.get(f"{base_url}/models", timeout=3).status_code == 200
    except httpx.HTTPError:
        return False


@pytest.fixture(scope="session")
def embedder():
    from askdocs.embeddings import SentenceTransformersProvider

    return SentenceTransformersProvider()


def _wait_for_qdrant():
    from qdrant_client import QdrantClient

    deadline = time.monotonic() + 30
    while True:
        try:
            client = QdrantClient(url=QDRANT_URL, timeout=5)
            client.get_collections()
            return client
        except Exception:
            if time.monotonic() > deadline:
                raise
            time.sleep(1)


@pytest.fixture
def clean_store(embedder):
    """QdrantStore over a collection that is dropped before every test."""
    from askdocs.store import QdrantStore

    client = _wait_for_qdrant()
    if client.collection_exists(TEST_COLLECTION):
        client.delete_collection(TEST_COLLECTION)
    client.close()
    return QdrantStore(url=QDRANT_URL, collection=TEST_COLLECTION, dimension=embedder.dimension)
