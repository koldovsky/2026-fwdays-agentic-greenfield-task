## Why

Currently the parser agent only handles one expense per input, but users naturally describe multiple purchases in a single sentence (e.g., "купив каву за 50 і хліб за 30"). This means expenses are lost or bundled into one inaccurate record. Supporting multi-expense input reduces user friction and improves data accuracy.

## What Changes

- The parser agent will detect when a single input contains multiple purchases.
- Each detected purchase is extracted as a separate structured expense object.
- A new multi-expense response schema is introduced (array of expense objects).
- The Checker validates each expense independently.
- The storage layer inserts one DB row per expense in the array.

## Capabilities

### New Capabilities

- `multi-expense-split`: Detect and split a single user input containing multiple purchases into separate expense records, each conforming to the existing expense schema.

### Modified Capabilities

- `expense-datetime-inference`: The datetime inference rules must apply independently to each split expense (each inherits the receipt timestamp unless it has its own relative/explicit time).

## Impact

- **Parser agent**: Updated system prompt and output schema to return an array instead of a single object.
- **Checker**: Must iterate over array and validate each item independently.
- **Storage layer**: Insert loop over returned array.
- **Evals**: Gold standard fixtures need multi-expense test cases.
