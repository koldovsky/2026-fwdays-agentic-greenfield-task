FROM python:3.11-slim

WORKDIR /app

RUN pip install --no-cache-dir \
    python-dotenv==1.1.0 \
    "python-telegram-bot[job-queue]==21.10"

COPY bot/ bot/

ENV DATABASE_PATH=/app/data/bot.db

CMD ["python", "-m", "bot"]
