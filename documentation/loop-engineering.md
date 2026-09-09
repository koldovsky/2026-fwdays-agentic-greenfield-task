# Loop Engineering Plan

> Design systems that prompt agents instead of manually prompting agents yourself.

---

# Objective

## Problem

What repetitive engineering work should become autonomous?

- Goal: 
- Current manual process:
- Desired outcome:
- Success metrics:

---

# Loop Definition

## Context Assembly

Each agent receives only the context required for its task.

Context is assembled from three sources:

### [Knowledge (Static)](knowledge.md)

Long-lived information:

* Architecture
* Coding standards
* Skills
* Policies
* Documentation

### [Memory (Dynamic)](memory.md)

Operational state:

* Previous runs
* Failed attempts
* Retry history
* Recent decisions
* Known blockers

### Task Context (Ephemeral)

Execution-specific information:

* Current issue
* Relevant files
* Recent commits
* CI failures
* Logs
* Metrics
* Pull request diff

---

## Context Engineering

### Principles

- Minimal context over maximal context
- Retrieve rather than preload
- Separate static, dynamic, and ephemeral information
- Summarize before truncating
- Make context reproducible
- Context should be deterministic whenever possible


Task
    ↓
Retrieve Knowledge
    ↓
Retrieve Skills
    ↓
Retrieve Memory
    ↓
Retrieve Artifacts
    ↓
Assemble Prompt
    ↓
Execute

---

## Trigger

How does the loop begin?

- [ ] Scheduled
- [ ] Webhook/Event
- [ ] CI/CD
- [ ] Manual kickoff
- [ ] Repository activity
- [ ] Issue tracker
- [ ] Monitoring alert

Trigger details:

---

## Inputs

What information does the loop require?

- Repository
- Documentation
- Issues
- Backlog
- CI results
- Logs
- Metrics
- Previous loop state
- External systems

---

## Loop State

Possible states:

- Idle
- Discovering
- Prioritizing
- Planning
- Executing
- Verifying
- Retrying
- Waiting for Human
- Completed
- Failed

---

# Discovery Phase

How is work discovered?

Possible sources:

- Open issues
- Failed builds
- Failing tests
- TODO markers
- Technical debt
- Security alerts
- Dependency updates
- Monitoring anomalies
- Product roadmap

Discovery logic:

---

# Prioritization

How does the system choose work?

Rules:

- Severity
- Customer impact
- Effort estimate
- Confidence
- Dependencies
- Risk

Priority algorithm:

---

# Task Generation

How are discovered items converted into work?

Example:

- Create implementation plan
- Split into subtasks
- Estimate complexity
- Assign labels
- Create worktree

Outputs:

---

# Execution Agents

Agents should retrieve context, not inherit it.

```text
Task
    ↓
Retrieve relevant knowledge
    ↓
Retrieve recent memory
    ↓
Retrieve task artifacts
    ↓
Execute```

## Loop Controller

Responsible for:

- orchestrating agents
- assembling context
- maintaining state
- retry decisions
- cost budgeting
- human escalation

Define specialized agents.

## Planner

Responsibilities:

Inputs:

Outputs:

---

## Builder

Responsibilities:

Inputs:

Outputs:

---

## Reviewer

Responsibilities:

Inputs:

Outputs:

---

## Tester

Responsibilities:

Inputs:

Outputs:

---

## Documentation Agent

Responsibilities:

Inputs:

Outputs:

---

# Verification

Never allow the producing agent to verify itself.

Verification checklist:

- [ ] Builds successfully
- [ ] Tests pass
- [ ] Lint passes
- [ ] Documentation updated
- [ ] Requirements satisfied
- [ ] Regression check
- [ ] Security review
- [ ] Human approval (if required)

Verification strategy:

---

# Retry Policy

If verification fails:

- Maximum retries:
- Retry strategy:
- Escalation policy:
- Stop conditions:

---

# Human Review

Human checkpoints:

- High-risk changes
- Architecture changes
- Security changes
- Production deployment
- Cost threshold exceeded

Approval workflow:

---

# Memory

Persistent state should survive every run.

State includes:

- Completed work
- Failed attempts
- Retry count
- Known issues
- Decisions
- Open questions
- Previous summaries

Storage:

- Markdown
- Database
- Issue tracker
- Knowledge base
- Vector store

---

# Scheduling

Frequency:

- Hourly
- Daily
- Weekly
- Event-driven

Maintenance windows:

---

# Connectors

External integrations.

Repositories:

Issue trackers:

CI/CD:

Monitoring:

Messaging:

Documentation:

---

# Cost Controls

Token budget:

Time budget:

Maximum retries:

Maximum concurrent agents:

Termination rules:

---

# Observability

Metrics:

- Loop duration
- Success rate
- Verification failures
- Retry count
- Human interventions
- Cost
- Token usage
- PR merge rate

Dashboards:

Alerts:

---

# Failure Modes

Possible failures:

- Hallucinated fixes
- Infinite loops
- Context drift
- Duplicate work
- Verification bypass
- Token explosion
- Repository conflicts

Mitigations:

---

# Security

Permissions:

Secrets:

Sandboxing:

Allowed tools:

Restricted operations:

---

# Continuous Improvement

The loop should improve itself over time.

Possible improvements:

- Refine discovery logic
- Improve prioritization
- Expand reusable skills
- Promote successful patterns into Knowledge
- Reduce execution cost
- Improve verification
- Remove repetitive human approvals

Review cadence:

---

# Example Flow

```text
Trigger
    ↓
Collect Inputs
    ↓
Assemble Context
    ↓
Discover Work
    ↓
Prioritize
    ↓
Plan
    ↓
Create Worktree
    ↓
Builder Agent
    ↓
Reviewer Agent
    ↓
Tester Agent
    ↓
Verification
    ├── Fail → Retry
    └── Pass
            ↓
Persist Memory
			↓
Update Knowledge (optional)
            ↓
Create PR
            ↓
Notify Human
            ↓
Schedule Next Run
```

---

# Definition of Done

The loop is complete when:

- [ ] Goal achieved
- [ ] Verification passed
- [ ] State persisted
- [ ] Documentation updated
- [ ] Human review completed (if required)
- [ ] Metrics recorded

---

Agents should receive the minimum context necessary to perform their responsibilities, reducing token usage, context drift, and unintended coupling.


# Reusable Skills

Reusable operational procedures available to agents.

- Release checklist
- Refactoring guide
- Coding standards
- Deployment playbook
- Incident response
- Testing strategy

# Principles

- Automate execution, not judgment.
- Separate generation from verification.
- Persist state across runs.
- Keep humans responsible for critical decisions.
- Design for recovery, not perfection.
- Optimize the loop, not individual prompts.

# Termination Conditions

Stop when:

- Goal completed
- No high-confidence work remains
- Retry budget exhausted
- Cost budget exceeded
- Human approval required
- External dependency unavailable
- Verification repeatedly fails

--- 
