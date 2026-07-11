# PRD to Gherkin Feature File Writer

Convert product requirements (Product Requirements Documents (PRDs), feature specs, user stories) into well-structured Gherkin `.feature` files grouped by **business Rule**, following Behavior-Driven Development (BDD) best practices.

## Input

The orchestrator supplies the assigned feature section text from the PRD and the output file path. The writer does not gather its own context — it works solely with what the orchestrator provides.

## Conversion Model

The conversion from feature listing in PRD. For each subsection go over the detailed description to extract subfeature details,
then proceed with conversion:

| PRD | BDD (Gherkin) |
|-----|---------------|
| Feature ID | @feature:<FEATURE-ID> |
| Feature Name | Feature: <name> |
| Subfeature Name | Rule: <name> |
| Subfeature Description | Scenario: <narrative> |
| Subfeature Acceptance Criteria | <happy path test case skeleton> |
| Target Users/Personas | Persona context in Background or step names |

For each feature work out at least one alternative path and/or edge case.
Use `Rule` keyword as grouping key for subfeatures coming from same feature.

## Gherkin File Structure

```gherkin
@feature:[FEATURE-ID]
Feature: [Feature Name from PRD]
  As a [primary persona]
  I want [goal from problem statement]
  So that [business value / outcome]

  Background: (optional — only if ALL scenarios share the same setup)
    Given [shared precondition]

  Rule: [Business Rule — extracted from subfeature name]

    Scenario: [Happy path — what success looks like]
      Given [initial state — who and what context]
      When [action the persona takes]
      Then [observable outcome]

    Scenario: [Alternative / Edge case]
      Given [different initial state]
      When [same or related action]
      Then [different observable outcome]

  Rule: [Next Business Rule]

    Scenario: [...]
      ...
```

Apply BDD Quality Rules from @references/bdd-quality-rules.md and tag taxonomy rules from @references/test-scenario-tags.md.

## Output

Write the `.feature` file to the path supplied by the orchestrator. The file must contain exactly one Feature with one or more Rules, each Rule having at least one happy-path Scenario and at least one alternative/edge-case Scenario. Every Scenario must carry a test-layer tag (`@web` / `@api` / `@integration`) and an execution-scope tag (`@smoke` / `@regression` / `@wip` / `@future`).
