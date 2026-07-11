# Use Pyrefly for Python static type checking

## Context and Problem Statement

The backend Python codebase is configured with mypy in `strict` mode. As the service surface grows (FastAPI routes, SQLModel models, port adapters, BDD step modules) the wall-clock time of `uv run mypy .` is becoming a bottleneck in the inner dev loop and CI. We need a faster type checker that preserves correctness guarantees, or a credible plan to migrate. Which one should we adopt?

## Considered Options

* mypy (current default, with `strict = true`)
* Pyrefly (Meta's Rust-based checker, 1.0 shipped 2026-05-12)
* ty (Astral's checker, fastest raw engine)

## Decision Outcome

Chosen option: "Pyrefly", because Meta's Pyrefly 1.0 shipped May 12 with 10-50x speed over mypy on real codebases, 87.8% typing spec conformance, and a migration tool that reads your `mypy.ini`. mypy 2.0 followed with experimental parallel checking (up to 5x faster with 8 workers) and three breaking default changes. Astral's ty remains the fastest raw engine but sits at 53.2% conformance — fine for editor feedback, risky for CI enforcement. If you're starting fresh, Pyrefly gives you the best balance of speed and correctness today. If you're mid-project on mypy with heavy plugin usage (Django ORM, Pydantic v1, SQLAlchemy stubs), stay put until Pyrefly's plugin story matures.

### Consequences

* Good, because type-check wall-clock drops by an order of magnitude on this codebase, shrinking the inner-loop feedback cycle.
* Good, because 87.8% spec conformance means CI enforcement of strict typing is realistic; the remaining ~12% are documented gaps we can pin per-module.
* Good, because the `mypy.ini` migration tool re-uses our existing `strict` configuration rather than re-deriving it.
* Bad, because projects with heavy mypy plugin usage (Django ORM, Pydantic v1, SQLAlchemy stubs) should defer adoption until Pyrefly's plugin story matures — the current backend uses Pydantic 2 and SQLModel 0.0.39, both on Pyrefly's supported path, but downstream services may differ.
* Bad, because mypy 2.0's parallel-checking experiment will narrow the speed gap; we will need to re-evaluate when mypy 2.x stabilises.
