## BDD Quality Rules

When writing **Acceptance Criteria**, always use Behavior-Driven Development (BDD) principles.

### Required Format

Each acceptance criterion **must** follow the structure:

> **Given** `<initial context>`
> **When** `<user action or triggering event>`
> **Then** `<observable expected outcome>`

---

### Rules

1. **Describe behavior, not implementation**
   - Focus on externally observable behavior.
   - Do not mention classes, functions, APIs, SQL queries, internal variables, or algorithms unless they are part of the observable behavior.

2. **One behavior per acceptance criterion**
   - Each criterion should validate exactly one business rule or outcome.

3. **One triggering event**
   - The **When** clause should describe a single action or event.

4. **Use preconditions in Given**
   - Describe the starting state only.
   - Do not perform actions in the Given clause.

5. **Use observable outcomes in Then**
   - Outcomes must be verifiable by a user, tester, or external system.
   - Avoid describing internal state changes unless they are externally observable.

6. **Write from the business perspective**
   - Use domain terminology instead of implementation details.
   - Prefer user-facing language.

7. **Be precise**
   - Avoid vague words such as:
     - works
     - succeeds
     - correctly
     - appropriate
     - properly
   - State the exact expected outcome.

8. **Keep scenarios independent**
   - Acceptance criteria must not depend on previous scenarios or execution order.

9. **Keep criteria concise**
   - Prefer a single Given, one When, and one Then.
   - Avoid combining multiple behaviors into one criterion.

10. **Use deterministic outcomes**
    - Given the same inputs and conditions, the expected result should always be identical.

---

### Preferred Example

> Given an EPUB containing HTML formatting
> When the extraction pipeline processes the document
> Then all HTML tags are preserved in the extracted content

### Avoid

> Given the parser calls BeautifulSoup
> When parsing occurs
> Then the HTML tree is stored correctly

Reason: This describes implementation instead of observable behavior.
