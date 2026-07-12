## MODIFIED Requirements

### Requirement: LangChain LCEL chain replaces direct OpenAI SDK calls

The expense parser SHALL use a LangChain Expression Language (LCEL) chain composed of `ChatPromptTemplate | ChatOpenAI.with_structured_output(ExpenseList)` instead of the direct `openai` SDK client.

#### Scenario: Single expense parsed via LangChain chain
- **WHEN** `extract_expense("купив каву за 50")` is called
- **THEN** the chain SHALL invoke `ChatOpenAI` with a `ChatPromptTemplate`-assembled message and return a list containing one `Expense` object with `amount=50`, `category="Кафе/Ресторани"`, and `confidence>=0.9`

#### Scenario: Multiple expenses parsed via LangChain chain
- **WHEN** `extract_expense("купив каву за 50 і хліб за 30")` is called
- **THEN** the chain SHALL return a list of two `Expense` objects with amounts 50 and 30 respectively

#### Scenario: Chain execution traced by Langsmith when enabled
- **WHEN** Langsmith is configured and the chain invokes `ChatOpenAI`
- **THEN** the entire chain execution SHALL be captured by Langsmith tracing, including prompts, responses, and token counts
