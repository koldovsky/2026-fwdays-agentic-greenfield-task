import os
from dotenv import load_dotenv

load_dotenv()

# Telegram
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("TELEGRAM_BOT_TOKEN is not set in .env")

# OpenAI
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY is not set in .env")

# PostgreSQL
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5432"))
DB_USER = os.getenv("DB_USER", "tracker_user")
DB_PASSWORD = os.getenv("DB_PASSWORD")
if not DB_PASSWORD:
    raise ValueError("DB_PASSWORD is not set in .env")
DB_NAME = os.getenv("DB_NAME", "expense_tracker")

# Build connection string
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Environment
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Category vocabulary (from AGENTS.md)
VALID_CATEGORIES = {
    "Продукти",
    "Транспорт",
    "Кафе/Ресторани",
    "Комуналки",
    "Розваги",
    "Здоров'я",
    "Покупки",
    "Інше",
}

# Confidence threshold for soft-fail
CONFIDENCE_THRESHOLD = 0.7

# Max retries on hard-fail
MAX_RETRIES = 3

# LLM model
LLM_MODEL = "gpt-4o-mini"

# LangSmith
LANGSMITH_API_KEY = os.getenv("LANGSMITH_API_KEY")
LANGSMITH_ENDPOINT = os.getenv("LANGSMITH_ENDPOINT", "https://eu.api.smith.langchain.com")
LANGSMITH_PROJECT = os.getenv("LANGSMITH_PROJECT", "expense-tracker")

# Error messages (Ukrainian)
ERROR_MESSAGES = {
    "AMOUNT_REQUIRED": "Сума витрати не вказана або некоректна. Будь ласка, надайте число > 0.",
    "INVALID_CATEGORY": "Категорія витрати не розпізнана. Скористайтеся однією з 8 стандартних.",
    "INVALID_DATETIME": "Дата/час некоректна. Будь ласка, вкажіть у форматі ISO 8601 або відносно (наприклад, 'годину назад').",
    "EMPTY_DESCRIPTION": "Опис витрати не може бути порожнім.",
    "PARSE_FAILED": "Не вдалось розпізнати витрату. Будь ласка, надайте суму та категорію більш чітко.",
    "VALIDATION_FAILED": "Помилка валідації витрати. Спробуйте ще раз.",
    "DB_CONNECTION_ERROR": "Помилка підключення до БД. Спробуйте пізніше.",
    "DB_INTEGRITY_ERROR": "Некоректні дані витрати. Перевірте суму та категорію.",
    "DB_ERROR": "Помилка при збереженні. Спробуйте пізніше.",
    "PROCESSING_FAILED": "Не вдалось обробити витрату після 3 спроб. Спробуйте ще раз або надайте більше деталей.",
}
