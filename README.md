# Expense Tracker

A Telegram-based expense tracker that uses an LLM agent to parse free-form Ukrainian text into structured expenses.

## Overview

**Features (MVP)**:
- Record expenses via Telegram text messages
- LLM-powered parser extracts: amount, category, description, and datetime
- Rule-based validator ensures quality
- PostgreSQL storage
- Simple report command (`/report`)

**Stack**:
- Language: Python 3.10+
- LLM: OpenAI (GPT-4o-mini) via LangChain (LCEL chain + structured output)
- Tracing/evals: Langsmith (optional)
- Telegram: `python-telegram-bot`
- Storage: PostgreSQL (Docker Compose)
- Validation: Pydantic v2 (hard-fail rules at construction)
- Testing: pytest

## Quick Start

### 1. Set Up Environment

```bash
# Clone repo
cd 2026-fwdays-agentic-greenfield-task

# Create venv
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Secrets

```bash
# Copy template
cp .env.example .env

# Edit .env and add:
# TELEGRAM_BOT_TOKEN=<your_bot_token>
# OPENAI_API_KEY=<your_openai_api_key>
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

The database is ready when the health check passes (see `docker-compose.yml`).

### 4. Run the Bot

```bash
python -m src.bot
```

The bot will start polling for messages.

### 5. Test Locally

Open Telegram and send your bot a message:
```
купив каву за 50
```

Expected reply:
```
✅ Витрата записана: 50 UAH (Кафе/Ресторани)
```

View all expenses:
```
/report
```

## Project Structure

```
.
├── AGENTS.md                    # Parser-agent context: schema, rules, few-shot examples
├── CLAUDE.md                    # Points to AGENTS.md (project instructions)
├── README.md                    # This file
├── docs/
│   └── prd.md                   # Product spec (PRD)
├── migrations/
│   └── init.sql                 # Database schema
├── data/
│   └── eval_reference.json      # Gold-standard dataset for Langsmith evaluators
├── openspec/                    # Spec-driven dev: active specs + archived changes
│   ├── specs/                   # 8 capability specs (requirements + scenarios)
│   ├── changes/                 # Active: add-langsmith, arch-review-improvements
│   └── changes/archive/         # 3 completed changes
├── src/
│   ├── __init__.py
│   ├── agent.py                 # LangChain parser (LLM extraction + retry)
│   ├── models.py                # Pydantic Expense / ValidationResult (hard-fail rules)
│   ├── validator.py             # Soft-fail checker (confidence threshold)
│   ├── processor.py             # Orchestrator (parse → validate → retry loop)
│   ├── storage.py               # PostgreSQL store (injectable conn_factory)
│   ├── evals.py                 # Langsmith evaluators (category/amount/calibration)
│   ├── bot.py                   # Telegram interface
│   └── config.py                # Config, constants, category vocabulary
├── tests/
│   ├── test_validator.py        # Hard-fail rules (Pydantic construction)
│   ├── test_processor.py        # Retry loop with injected fakes (no LLM)
│   ├── test_storage.py          # Store with fake connection (no DB)
│   ├── test_agent_datetime.py   # Datetime inference with fake chain (no LLM)
│   ├── test_langsmith.py        # submit_feedback + evaluators
│   ├── test_integration.py      # E2E: parse → validate (requires OPENAI_API_KEY)
│   └── evals/
│       └── test_reasoning.py    # 9 reasoning evals + 80% pass-rate gate
├── .github/
│   └── pull_request_template.md # Submission checklist
├── docker-compose.yml           # PostgreSQL container
├── requirements.txt             # Dependencies
├── pyproject.toml               # Python config (black/ruff/mypy)
└── .env.example                 # Secrets template
```

## Testing

### Run All Tests

```bash
pytest
```

### Run Non-LLM Unit Tests (no API key required)

```bash
pytest tests/test_validator.py tests/test_processor.py tests/test_storage.py tests/test_agent_datetime.py tests/test_langsmith.py
```

These use injected fakes (fake chain, fake DB connection) and run offline.

### Run Reasoning Evals

```bash
pytest tests/evals/test_reasoning.py -v
```

Pass rate target: **≥ 80%** (enforced in [test_reasoning.py](tests/evals/test_reasoning.py)).

> **Note:** Evals and integration tests call the real OpenAI API and require `OPENAI_API_KEY`. Run them when you want to measure agent correctness, not on every commit.

### Run Integration Tests

```bash
pytest tests/test_integration.py
```

### With Coverage

```bash
pytest --cov=src
```

## Code Style

### Format

```bash
black .
```

### Lint

```bash
ruff check .
ruff check . --fix
```

### Type Check

```bash
mypy .
```

## How It Works

### 1. Parse (Agent)

User sends: `"купив каву за 50"`

Agent (LLM) extracts:
```json
{
  "amount": 50,
  "currency": "UAH",
  "category": "Кафе/Ресторани",
  "description": "купив каву за 50",
  "datetime": "2026-06-27T14:30:00",
  "confidence": 0.95
}
```

### 2. Validate (Checker)

Checker validates:
- ✅ `amount > 0`
- ✅ `category ∈ enum`
- ✅ `datetime` valid & not future
- ✅ `confidence ∈ [0.0, 1.0]`

### 3. Store

If valid → insert into PostgreSQL
If soft-fail (low confidence) → store with error flag
If hard-fail → agent retries (max 3)

### 4. Reply

```
✅ Витрата записана: 50 UAH (Кафе/Ресторани)
```

## Category Vocabulary

The parser maps all expenses to one of 8 categories:

1. **Продукти** — Groceries, food shopping
2. **Транспорт** — Gas, transit, taxi
3. **Кафе/Ресторани** — Dining out
4. **Комуналки** — Utilities, rent
5. **Розваги** — Entertainment, hobbies
6. **Здоров'я** — Healthcare, pharmacy
7. **Покупки** — Clothing, household goods
8. **Інше** — Catch-all (unclear)

## Langsmith Tracing (Optional)

To enable end-to-end tracing of LLM calls and run custom evaluators, set these environment variables:

```bash
export LANGSMITH_API_KEY=<your_langsmith_api_key>
export LANGSMITH_PROJECT=<your_project_name>
```

When set, the parser automatically traces every chain invocation to Langsmith, including token usage, prompts, and extracted expense metadata (amounts, categories, confidences).

To run the custom evaluators against traced runs, use the functions in `src/evals.py`:

```python
from src.evals import evaluate_category_accuracy, evaluate_amount_accuracy, evaluate_confidence_calibration
```

To submit a correction for evaluator training:

```python
from src.agent import submit_feedback
submit_feedback(run_id="...", expected_category="Транспорт", expected_amount=200)
```

## Out of Scope (MVP)

The following features are documented but intentionally not implemented in the MVP:

### Data Retention & Cleanup

- **`validation_logs` 30-day retention policy**: Documented in code comments and database schema, but automatic cleanup is not implemented.
- **Why**: Requires a background job (e.g., APScheduler, Celery, or a cron task outside the bot process).

### Architectural Improvements (Deferred)

- **Migration to UTC timezone**: Currently all timestamps are in local (naive) timezone. Migration to UTC would require schema changes and careful date handling across the codebase.
- **Advanced Error Categorization**: Current error handling distinguishes connection errors, integrity violations, and generic DB errors. More granular categorization (e.g., specific CHECK constraint names) is out of scope.

---

## Future (MVP+1)

- Voice input (STT)
- Category/period filtering
- Budget alerts
- Charts & visualizations

## Agentic Engineering Practices

This project demonstrates:

1. **Context Engineering** (`AGENTS.md`) — Agent system prompt, category vocab, behavior rules
2. **Loop Cycles** — Agent parses, validator checks, agent retries (max 3)
3. **Verification** — Unit tests + reasoning evals (10 hand-written test cases, ≥80% pass rate)
4. **Maker ≠ Checker** — Separate agent (LLM extraction) and validator (rule-based checking)
5. **Specification** (`docs/prd.md`) — Product spec before code

## License

Personal project for Agentic Engineering: Greenfield (fwdays Academy).
