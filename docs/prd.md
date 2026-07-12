# Expense Tracker — Product Requirements Document

## 1. Overview

**Product**: A Telegram-based expense tracker that accepts free-form Ukrainian text, parses it into structured expenses using an LLM agent, validates the output, stores it in PostgreSQL, and provides simple reporting.

**MVP Scope**: Text input → parse → validate → store → list + total report.

**Deferred**: Voice input (STT), category/period analysis, budget alerts, charts.

**Users**: Individual (self) — personal expense tracking via Telegram.

---

## 2. User Flows

### 2.1 Happy Path: Record an Expense

1. User sends message to bot: `"купив каву за 50"`
2. Agent extracts: `{amount: 50, category: "Кафе/Ресторани", datetime: "2026-06-27T14:30:00", confidence: 0.95, description: "купив каву за 50"}`
3. Validator checks: amount > 0 ✓, category ∈ enum ✓, datetime valid ✓, confidence ∈ [0, 1] ✓
4. Bot stores expense in PostgreSQL
5. Bot replies: `"✅ Витрата записана: 50 UAH (Кафе/Ресторани)"`

### 2.2 Hard-Fail Path: Invalid Category (Retry)

1. User: `"витратив на якусь дивну річ"`
2. Agent (attempt 1): maps to unknown category or hallucinates → checker rejects
3. Agent (attempt 2–3): retries with feedback (original message + validation error)
4. After 3 retries: bot asks user to clarify or categorize manually
5. User clarifies → expense recorded or dismissed

### 2.3 Soft-Fail Path: Low Confidence

1. User: `"витрати"`
2. Agent: `{amount: null, category: null, confidence: 0.2, ...}` (too vague)
3. Validator: soft-fail (low confidence, but structurally valid)
4. Bot replies: `"⚠️ Не впевнений. Спробуйте ще раз з більш докладною інформацією."`
5. User retries with detail → success

### 2.4 Report Flow

1. User: `/report` or `/витрати`
2. Bot queries PostgreSQL: all expenses (or filtered by date/category if deferred)
3. Bot replies: list of expenses + total sum
4. Format (MVP): `Витрати: 50 UAH (Кафе/Ресторани), 100 UAH (Транспорт)... Всього: 150 UAH`

---

## 3. Functional Requirements

### 3.1 Parser Agent (LLM)

**Input**: Free-form Ukrainian text (e.g., "на бенз 200", "купив каву за 50")

**Output**: JSON (structured expense)

```json
{
  "amount": number,           // > 0, required
  "currency": "UAH",          // hardcoded
  "category": string,         // ∈ enum, required
  "description": string,      // original user text, required
  "datetime": string,         // ISO 8601, required (infer now if not specified)
  "confidence": number        // 0.0–1.0, required
}
```

**Behavior**:
- If no time specified → use current time (now)
- If category ambiguous → map to closest enum OR "Інше" + preserve raw word in description
- Must not hallucinate fields outside schema
- Must return confidence score (0–1)

**Constraints**:
- Max 3 retries on hard-fail
- No external data sources (no live currency rates, etc.)
- Category vocabulary fixed (no agent-proposed categories in MVP)

### 3.2 Validator (Rule-Based Checker)

**Input**: Parsed expense (JSON from agent)

**Output**: `{valid: bool, errors: list[str], feedback: str}`

**Validation Rules**:
1. `amount > 0` (hard-fail)
2. `amount` is a valid number (hard-fail)
3. `category ∈ enum` (hard-fail) — enum: Продукти, Транспорт, Кафе/Ресторани, Комуналки, Розваги, Здоров'я, Покупки, Інше
4. `datetime` is valid ISO 8601, not in future (hard-fail)
5. `confidence ∈ [0.0, 1.0]` (hard-fail)
6. `description` non-empty (hard-fail)
7. `confidence < 0.7` (soft-fail) — flag for review but store

**Hard-Fail Behavior**: Return errors; agent retries with feedback.

**Soft-Fail Behavior**: Store expense with error flag; bot notifies user.

### 3.3 Storage (PostgreSQL)

**Schema** (single `expenses` table):
```sql
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UAH',
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  datetime TIMESTAMP NOT NULL,
  confidence DECIMAL(3, 2),
  validation_errors TEXT,  -- NULL if valid, else error list
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Constraints**:
- Docker Compose for local dev (PostgreSQL in container)
- Migrations: use `alembic` or manual `.sql` scripts

### 3.4 Telegram Bot Interface

**Commands**:
- `/start` — welcome, explain usage
- `/report` — list expenses + total (MVP)
- Free text (any message) → parsed as expense

**Replies**:
- Success: `✅ Витрата записана: 50 UAH (Кафе/Ресторани)`
- Hard-fail after retries: `❌ Не вдалось обробити. Спробуйте ще раз або надайте більше деталей.`
- Soft-fail (low confidence): `⚠️ Не впевнений. Спробуйте ще раз.`
- Report: list + sum

**Stack**:
- `python-telegram-bot`
- Polling or webhook (polling for simplicity in MVP)

### 3.5 Entry Point

**Single function**: `process_expense(raw_text: str) -> dict`
- Calls agent
- Retries on hard-fail (up to 3)
- Calls validator
- Returns `{expense, valid: bool, errors: str}`

Bot calls this function; storage/reply logic is separate.

---

## 4. Technical Requirements

**Language**: Python 3.10+

**Stack**:
- LLM: OpenAI (structured output via JSON mode)
- Telegram: `python-telegram-bot`
- Storage: PostgreSQL (Docker Compose)
- Testing: `pytest`
- Code style: Black, Ruff, MyPy

**Project Structure**:
```
.
├── AGENTS.md              # Agent system prompt & context
├── docs/
│   ├── prd.md             # This document
│   └── spec.md            # (deferred)
├── src/
│   ├── __init__.py
│   ├── agent.py           # Parser agent (LLM)
│   ├── validator.py       # Checker (rule-based)
│   ├── processor.py       # process_expense() entry point
│   ├── storage.py         # PostgreSQL queries
│   ├── bot.py             # Telegram bot
│   └── config.py          # Config (API keys, categories, etc.)
├── tests/
│   ├── test_agent.py      # Unit tests for agent
│   ├── test_validator.py  # Unit tests for validator
│   ├── evals/
│   │   └── test_reasoning.py  # 9 reasoning evals (agent correctness)
│   └── test_integration.py    # Integration tests (happy + error paths)
├── docker-compose.yml     # PostgreSQL
├── requirements.txt       # Dependencies
├── pyproject.toml         # Python version, tools
├── .env.example           # Secrets template
└── README.md              # How to run
```

---

## 5. Acceptance Criteria

### Agent Reasoning
- [ ] Agent correctly maps "на бенз" → Транспорт (evals test this)
- [ ] Agent maps ambiguous input to "Інше" with confidence < threshold
- [ ] Agent infers current time when no time specified
- [ ] Agent returns valid JSON schema (no hallucinated fields)

### Validator
- [ ] Rejects amount ≤ 0
- [ ] Rejects out-of-vocabulary categories
- [ ] Rejects invalid datetime
- [ ] Accepts valid expenses

### Integration
- [ ] Bot receives text → process_expense() → stored in PostgreSQL
- [ ] Bot retries on hard-fail (max 3)
- [ ] Bot replies with confirmation or error
- [ ] /report lists all expenses + sum

### Evals
- [ ] 9 reasoning test cases (hand-written), ≥80% pass rate
- [ ] Integration tests cover: happy path, hard-fail + retry, soft-fail

---

## 6. Out of Scope (MVP)

- Voice input (STT) — deferred to MVP+1
- Category/period analysis — deferred
- Budget alerts / limits — deferred
- Charts / visualizations — deferred
- Multi-user support — single-user only
- Currency conversion — UAH only
- Recurring expenses — deferred

---

## 7. Success Metrics

- Agent passes ≥80% of 9 reasoning evals
- Bot processes a live expense (Telegram message → PostgreSQL) without errors
- Validator catches all hard-fail cases
- Checker rejects invalid output; agent retries and succeeds
