## 1. Loop Controller Refactor

- [ ] 1.1 Replace all `setTimeout` mocks in `loop-controller.js` with real agent function stubs that read/write artifact files
- [ ] 1.2 Implement the main `runLoop` state machine with explicit phase labels: PLANNING, EXECUTING, VERIFYING, RETRYING, COMPLETED, FAILED
- [ ] 1.3 Add configurable retry counter (default: 3) that routes back to Builder on Tester or Reviewer failure
- [ ] 1.4 Add human escalation trigger: pause loop and emit structured escalation event when retry budget is exhausted or cost threshold is exceeded
- [ ] 1.5 Add termination conditions: goal achieved, retry budget exhausted, cost budget exceeded, verification repeatedly fails
- [ ] 1.6 Log remaining token budget after each agent completes

## 2. Memory Store

- [ ] 2.1 Implement `loop-memory.md` initialization: create the file on first run with a structured header
- [ ] 2.2 Write memory update logic that appends a timestamped entry after each phase boundary (Planner done, Builder done, Tester done, Reviewer done)
- [ ] 2.3 Implement recovery logic: on startup, read `loop-memory.md` to detect incomplete runs and resume from the last successful phase
- [ ] 2.4 Implement pruning: archive entries older than 30 days to `loop-memory-archive.md` on each run start

## 3. Planner Agent

- [ ] 3.1 Define the Planner agent function signature: `invokePlanner(issue, context) => { status, plan }`
- [ ] 3.2 Implement `CLARIFICATION_NEEDED` return path when the issue description is ambiguous (less than 10 words or missing a verb)
- [ ] 3.3 Write the Planner's retrieval manifest: declare which sections of `ARCHITECTURE.md` and which `.agents/skills/` files to load
- [ ] 3.4 Persist the plan to `plan.md` in the change artifact directory before returning

## 4. Builder Agent

- [ ] 4.1 Define the Builder agent function signature: `invokeBuilder(plan, context) => { diff }`
- [ ] 4.2 Enforce scope guard: Builder function SHALL NOT call Tester or Reviewer functions (add a lint/static check or module boundary)
- [ ] 4.3 Persist the diff to `diff.md` in the change artifact directory before returning
- [ ] 4.4 Ensure Builder logs do not contain test runner invocations (add assertion in integration test)

## 5. Tester Agent

- [ ] 5.1 Define the Tester agent function signature: `invokeTester(diff, context) => { verdict, failures, coverage }`
- [ ] 5.2 Implement test suite execution: run `npm test` (or project-equivalent) and capture stdout/stderr
- [ ] 5.3 Implement new-test generation stub: for each new exported function in the diff, emit a skeleton test case
- [ ] 5.4 Persist verdict to `test-report.md` (with `verdict`, `failures`, `coverage` fields) before returning
- [ ] 5.5 Verify Tester context does not include Builder's reasoning (unit test: assert context object has no `builderChain` key)

## 6. Reviewer Agent

- [ ] 6.1 Define the Reviewer agent function signature: `invokeReviewer(issue, plan, diff, context) => { verdict, reasons }`
- [ ] 6.2 Implement multi-source evaluation: check diff against issue description, plan subtasks, `AGENTS.md` coding standards, and `ARCHITECTURE.md` patterns
- [ ] 6.3 Implement actionable rejection report: include file name, line reference, and rule violated for each reason
- [ ] 6.4 Persist report to `review-report.md` (with `verdict` and `rationale` fields) before returning
- [ ] 6.5 Verify Reviewer context does not contain Builder chain-of-thought (unit test: assert no `builderReasoning` key in input)

## 7. Context Assembly

- [ ] 7.1 Implement `assembleContext(agentRole, task)` function that returns a context object tagged by layer (Knowledge / Memory / Task)
- [ ] 7.2 Define per-agent retrieval manifests as plain JS objects (what document sections each role needs)
- [ ] 7.3 Add context size guard: throw if assembled context exceeds the configured per-agent token limit
- [ ] 7.4 Write unit tests verifying each agent's context contains only its declared manifest items and no cross-agent bleed

## 8. Validation & Testing

- [ ] 8.1 Run `node loop-controller.js "Add structured logging"` and verify the happy path completes with all artifact files written
- [ ] 8.2 Run `node loop-controller.js "x"` (ambiguous input) and verify Planner returns `CLARIFICATION_NEEDED`
- [ ] 8.3 Simulate Tester failure (mock `testsPassed = false`) and verify retry counter increments and Builder is re-invoked
- [ ] 8.4 Simulate retry budget exhaustion and verify human escalation event is emitted
- [ ] 8.5 Verify `loop-memory.md` is written after each phase and survives a forced process kill + restart (resume from last phase)
- [ ] 8.6 Run `openspec validate --change loop-engineering` and ensure all artifacts pass validation

## 9. Documentation

- [ ] 9.1 Update `ARCHITECTURE.md` to add a loop data-flow diagram section (Trigger → Planner → Builder → Tester → Reviewer → Memory)
- [ ] 9.2 Update `AGENTS.md` Planner/Builder/Tester/Reviewer sections with the concrete function signatures and artifact file paths
- [ ] 9.3 Add a `README` section to `loop-controller.js` header comment explaining how to run the loop, configure retries, and read memory
