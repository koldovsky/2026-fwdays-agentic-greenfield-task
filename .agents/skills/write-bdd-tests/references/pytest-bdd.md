# Write BDD Tests with `pytest-bdd`

Write behaviour-driven tests using `pytest-bdd` that describe observable business behaviour rather than implementation details.

## Step Definitions

Organize step definitions as:

```
tests/
    features/
        notifications.feature

    step_defs/
        test_notifications.py
```

Use fixtures to share state between steps.

```python
from pytest_bdd import given, when, then

@given(..., target_fixture="user")
def user(...):
    ...

@when(..., target_fixture="result")
def result(...):
    ...

@then(...)
def verify(...):
    ...
```

### Step Rules

* Use `target_fixture` to pass state between steps.
* Keep step definitions thin.
* Delegate work to fixtures, factories, services, or helper functions.
* Avoid module-level mutable state.
* Avoid global variables.

### Property-Based Companion Tests

For logic-heavy features, add `Hypothesis` property-based tests alongside BDD scenarios. BDD scenarios verify representative examples, while property-based tests verify invariants over many generated inputs.

Example:

```python
from decimal import Decimal

from hypothesis import given, settings, strategies as st

from myapp.money import convert


@given(
    amount=st.decimals(
        min_value=Decimal("0.01"),
        max_value=Decimal("10000.00"),
        places=2,
    ),
    currency=st.sampled_from(["USD", "EUR", "GBP"]),
)
@settings(max_examples=200)
def test_currency_conversion_roundtrip(amount: Decimal, currency: str):
    """Converting to USD and back approximately preserves the original value."""

    usd = convert(amount, currency, "USD")
    converted_back = convert(usd, "USD", currency)

    assert abs(converted_back - amount) <= Decimal("0.01")
```


### Property-Based Companion Test Rules

* BDD tests verify specific scenarios; property-based tests verify invariants.
* Use property-based tests for mathematical properties, round-trip operations, idempotency, ordering, serialization, and other invariants.
* `max_examples=200` is a good default for CI, providing broad input coverage while keeping execution time reasonable.
* Generate realistic inputs using domain-specific strategies rather than overly broad primitives (for example, use fixed-point decimals for monetary values instead of arbitrary integers).
* Keep invariants independent of implementation details and assert externally observable behaviour.

## Test Factories

Use factory classes to construct domain objects for tests. Factories should encapsulate object creation so scenarios remain focused on behaviour rather than setup.

Example:

```python
import factory

from myapp.models import Order, Customer


class CustomerFactory(factory.Factory):
    class Meta:
        model = Customer

    name = factory.Faker("name")
    email = factory.Faker("email")
    status = "active"


class OrderFactory(factory.Factory):
    class Meta:
        model = Order

    customer = factory.SubFactory(CustomerFactory)
    reference = factory.Faker("uuid4")
    total = 0
```

### Factory Rules

* Every significant domain entity should have a corresponding factory.
* Never construct complex domain objects inline in tests.
* Provide sensible defaults so tests override only the values relevant to the scenario.
* Use `factory.SubFactory` to model relationships between entities.
* Use lazy or generated values (`factory.LazyFunction`, `factory.LazyAttribute`, `factory.Faker`, etc.) for dynamic fields.
* Use `create_batch(n)` or equivalent helpers when multiple instances are required.
* Keep factories deterministic where practical, overriding generated values explicitly when they are relevant to the assertions.
* Prefer extending or composing factories over duplicating setup code across tests.

## Step Reuse

* Keep feature-specific steps in the corresponding `test_<feature_slug>.py`.
* `feature_slug` is obtained by combining feature id with feature name by joining the word with undescores.
* Move steps reused by multiple features into `conftest.py`.
* Never duplicate equivalent step definitions.
* Prefer typed parsers such as `parsers.parse(...)` where appropriate.

## Scenario Binding (Required)

**Always bind every scenario explicitly.**

Do **not** use `scenarios("feature.feature")`, which automatically imports every scenario.

Instead, bind each scenario individually:

```python
from pytest_bdd import scenario

@scenario("../features/notifications.feature", "Successful login")
def test_successful_login():
    pass


@scenario("../features/notifications.feature", "Invalid password")
@pytest.mark.authentication
def test_invalid_password():
    pass
```

This enables:

* applying marks to individual scenarios,
* selectively skipping scenarios,
* running individual scenarios,
* clearer test reporting,
* independent ownership of each scenario.

Each scenario should correspond to exactly one test function.

## Typical Patterns

### Good patterns

* Factories create domain objects.
* Fixtures manage shared state.
* Independent scenarios.
* Reusable shared steps in `conftest.py`.

## Anti-patterns

Avoid:

* Copy-pasted step definitions.
* Global mutable state.
* Testing framework behaviour instead of business behaviour.
* Auto-binding all scenarios using `scenarios(...)`.
* Large step definitions containing business logic instead of orchestration.

## Test Design

BDD scenarios should verify observable behaviour at the feature or service level.

They should not replace focused unit tests or property-based tests, which remain appropriate for implementation-specific logic and invariants.
