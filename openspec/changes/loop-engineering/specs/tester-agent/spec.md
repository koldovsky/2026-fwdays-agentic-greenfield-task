## ADDED Requirements

### Requirement: Run existing test suite
The Tester agent SHALL execute the full existing test suite against the Builder's changes and report a binary pass/fail verdict with details of any failures.

#### Scenario: All tests pass
- **WHEN** the Tester runs the test suite and all tests exit with code 0
- **THEN** the Tester returns a verdict of pass with an empty failures array

#### Scenario: One or more tests fail
- **WHEN** any test exits with a non-zero code
- **THEN** the Tester returns a verdict of fail with the failing test names and error messages

### Requirement: Write new tests for changed code
The Tester agent SHALL write new automated unit or integration tests for every new function or module introduced by the Builder's diff.

#### Scenario: New function requires new test
- **WHEN** the Builder's diff introduces a new exported function
- **THEN** the Tester adds at least one test covering the happy-path scenario for that function

### Requirement: Independent verification
The Tester SHALL NOT share context or state with the Builder beyond the diff artifact. It SHALL load the current codebase independently to avoid confirmation bias.

#### Scenario: Tester loads codebase fresh
- **WHEN** the Tester begins its task
- **THEN** its context contains the diff and the current file state, not the Builder's reasoning chain

### Requirement: Verdict persistence
The Tester SHALL write its verdict (pass/fail, coverage summary, and failure details) to test-report.md in the change directory before the loop controller proceeds.

#### Scenario: Test report exists before Reviewer starts
- **WHEN** the Tester completes
- **THEN** test-report.md is present and contains a verdict field