# Course Analysis

## Source Material

- Day 1 video, 23.06: HTML5 MP4 from the course page.
- Day 2 video, 25.06: YouTube embed from the course page.
- Day 3 video, 27.06: HTML5 MP4 from the course page.
- Formal homework page: `lecture=165107`, module `49356`.

The formal homework page is the source of truth for submission requirements.

## Lecture Themes

### Day 1: New SDLC and Harness Engineering

The first session frames modern AI-first development as an engineering problem, not
only a generation problem. The important ideas for the homework are:

- generation is not the bottleneck; verification is;
- an agent is a model plus harness, tools, rules, and feedback;
- context must be engineered instead of improvised;
- a greenfield project should be friendly to agents from the first commit;
- specifications and repository context reduce comprehension and intent debt.

### Day 2: Project Factory and Loop Engineering

The second session focuses on repeatable loops:

- requirements -> specifications -> tests -> implementation -> verification -> proof;
- dynamic and static context;
- agent skills, connectors, sub-agents, memory, and worktrees;
- SDD and slicing capabilities instead of asking for a whole MVP at once;
- guardrails: maker is not checker, evals, tracing, review gates, and QA evidence.

### Day 3: Skill-Based Programming and Agent Runtime

The third session turns deterministic features into agent-facing capabilities:

- skill-based programming as an alternative home for some business logic;
- choosing between OpenClaw, NanoClaw, and Hermes-style approaches;
- integrating an agent runtime with a web or product surface;
- evaluating security, cost, and limits before expanding autonomy.

## Formal Homework Requirements

The required submission asks for:

- a small own project in any stack;
- visible Agentic Engineering practices: `AGENTS.md`, context, loops, verification,
  maker/checker, and SDD where appropriate;
- a 1-2 minute video demo;
- a fork of the homework repository with the project on a branch;
- a pull request with real name, demo link, and a meaningful description of what was
  done by the human and what was done by the agent;
- CodeRabbit review enabled on the fork if possible;
- the PR link submitted back on the course platform.

## Mapping to LoopLedger

LoopLedger was chosen because it demonstrates the course practices directly:

- `AGENTS.md` is static context and process guardrails.
- `docs/specification.md` is SDD before implementation.
- `docs/agentic-process-log.md` records the loop.
- `tests/test_loopledger.py` and `evals/evaluate.py` provide verification.
- `docs/checker-review.md` records a separate checker pass.
- `examples/agentic-homework.loopledger.json` is the dynamic evidence ledger.
- `demo/loopledger-demo.mp4` is the 1-2 minute demo artifact.

The product scope is intentionally small so the process can be completed end to end.
