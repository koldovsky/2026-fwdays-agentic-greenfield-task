FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/home/appuser

# Non-root user: the container bind-mounts the repo and ./corpus, so an RCE
# must not get root access to host files.
RUN useradd --create-home --uid 10001 appuser

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the embedding model into the image so containers run offline. The model
# name lives ONLY in askdocs/embeddings.py (single source of truth) — bake it by
# instantiating the provider, and do it as appuser so the cache lands in its home.
COPY --chown=appuser:appuser askdocs/ ./askdocs/
USER appuser
RUN python -c "from askdocs.embeddings import SentenceTransformersProvider; SentenceTransformersProvider()"

COPY --chown=appuser:appuser . .
