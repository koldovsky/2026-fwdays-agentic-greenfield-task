## Test Plan Template

Make a table with following fields:
- Test Case ID: an incremental identifier for the test case, follows the patter `TC-<ordinal index>`, 1-based.
- Feature ID: feature identifier from input
- Test Case Description: a brief human-readable descirption of the test case
- Status:
  - `Pending`: pending Implementation
  - `Partial`: due to missing features test could not be fully implemented yet
  - `Full`: test fully covers an aspect of a feature
  - `Broken`: test is currently broken
  - `Stale`: test is outdated and is not longer relevant for the project
- Note: any note (used for `Partial`, `Broken` and `Stale` tests)

The bdd-test-planner writes the table; the test-verifier updates the Status and Note columns. This file defines the schema only.
