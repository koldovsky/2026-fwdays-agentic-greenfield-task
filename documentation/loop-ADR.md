# Autonomous Software Engineering Loop

* Status: accepted
* Deciders: Greenfield Engineering Team
* Date: 2026-07-03

Technical Story: [Agentic Engineering Greenfield Task](https://github.com/agentic-engineering-greenfield)

## Context and Problem Statement

We need to automate repetitive engineering work to increase velocity and maintain consistency. The goal is to build an Autonomous Software Engineering Loop where AI agents handle task planning, implementation, testing, and review, guided by a system of minimal, deterministic context.

## Decision Drivers

* **Context Efficiency**: Agents must only receive the context required for their specific task to minimize token usage and hallucination.
* **Separation of Concerns**: Maker (Builder) should not be the Checker (Reviewer/Tester). Verification must be distinct from generation.
* **State Persistence**: The loop must maintain state across runs to facilitate retries, human review, and eventual completion.
* **Safety and Control**: Execution costs must be budgeted, and human checkpoints must exist for high-risk operations.

## Considered Options

* Option 1: Monolithic Agent (Single LLM prompted for everything)
* Option 2: Multi-Agent Orchestration via Node.js Script
* Option 3: Pure Agent-to-Agent Prompting (Implicit state passing)

## Decision Outcome

Chosen option: **Option 2: Multi-Agent Orchestration via Node.js Script**, because it provides deterministic orchestration, clear state boundaries, and easy integration with existing CI/CD or command line tooling.

### Positive Consequences

* High modularity; individual agent skills (planner, builder, tester, reviewer) can be tuned independently.
* Clear boundaries for verification (Tester and Reviewer run distinctly after Builder).
* The orchestrator can enforce strict cost budgets and retry limits programmatically.

### Negative Consequences

* Requires maintaining a custom orchestrator script (`loop-controller.js`).

## Pros and Cons of the Options

### Option 1: Monolithic Agent

* `+` Simplest to implement initially.
* `-` Context window fills quickly.
* `-` No separation of concerns (Maker = Checker).
* `-` Hallucination risk is high over long generation spans.

### Option 2: Multi-Agent Orchestration via Node.js Script

* `+` Explicit state management.
* `+` Easy to run locally (`node loop-controller.js`) and debug.
* `+` Follows the `loop-engineering.md` blueprint faithfully.
* `-` Minor overhead of writing the JS glue code.

### Option 3: Pure Agent-to-Agent Prompting

* `+` No custom glue code required.
* `-` State can drift if an agent hallucinates the next prompt.
* `-` Harder to enforce strict access controls and loop termination.