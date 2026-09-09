# AI Agent Guidelines (AGENTS.md)

Welcome! This document outlines the standards, behavioral expectations, and engineering workflows for AI agents operating in this workspace. All agent interactions, refactoring sessions, and feature additions must adhere to the principles defined below.

---

## 1. Core Principles

### Maker != Checker
To ensure high quality, maintainability, and security:
* **The producing agent (Builder) must never verify their own work.**
* All code changes written by a **Builder** must be explicitly validated by a **Tester** (via tests and evals) and audited by a **Reviewer** (via code review).

### Context Engineering over Context Explosion
Agents must optimize context usage to prevent hallucinations, reduce token costs, and avoid context drift:
* **Minimize context**: Only load files and documents directly related to the current task.
* **Retrieval-driven**: Retrieve knowledge on demand instead of preloading entire directories.
* **Structured context**: Separate static knowledge, dynamic operational memory, and ephemeral task details.

---

## 2. Agent Roles & Responsibilities

The autonomous loop is divided into four highly specialized agent roles:

```
  [Trigger / Issue]
         │
         ▼
    ┌──────────┐
    │ Planner  │ ──► Creates implementation plan & splits tasks
    └──────────┘
         │
         ▼
    ┌──────────┐
    │ Builder  │ ──► Implements code changes (The Maker)
    └──────────┘
         │
         ▼
    ┌──────────┐
    │  Tester  │ ──► Writes/runs test suite (The Checker)
    └──────────┘
         │
         ▼
    ┌──────────┐
    │ Reviewer │ ──► Approves PRs, checks rules (The Auditor)
    └──────────┘
```

### 📋 Planner
* **Responsibilities**: Analyze raw issue descriptions, research existing architecture patterns, map affected files, and draft the `implementation_plan.md`.
* **Behavior**: Must not write or modify runtime source code files. Focuses on system design and breaking work down into atomic subtasks.

### 🛠️ Builder
* **Responsibilities**: Take approved plans from the Planner and implement the changes in the source code.
* **Behavior**: Focuses on clean, readable code following the project styling guidelines. Ensures changes are contiguous where possible to minimize file modifications.

### 🧪 Tester
* **Responsibilities**: Run existing test suites and write new automated unit/integration tests for code written by the Builder.
* **Behavior**: Focuses on code coverage, error handling, edge cases, and mocking external components appropriately.

### 🔍 Reviewer
* **Responsibilities**: Audit code changes against styling guidelines, architectural designs, security constraints, and performance metrics.
* **Behavior**: Has final approval power before code is merged. If guidelines are violated, rejects and routes back to the Builder with precise feedback.

---

## 3. Engineering & Style Guidelines

When modifying or writing new code:
* **Maintain Clean Architecture**: Keep pure logic separate from side-effects. Follow the architecture defined in [ARCHITECTURE.md](file:///c:/Users/OhorodnikovMaksym/DEV/agentic-greenfield/2026-fwdays-agentic-greenfield-task/ARCHITECTURE.md).
* **Self-Documentation**: Write clear, descriptive code. Preserve all existing comments and JSDoc strings unless they are directly invalidated by the changes.
* **No Placeholders**: Never leave `// TODO` or placeholder code unless explicitly requested. Every path must be fully implemented.
* **Error Handling**: Always handle promises and potential exceptions. Do not let errors fail silently.
