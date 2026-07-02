# Design

Production preview resolves the active BOM and multiplies decimal component factors by target output. Validation stops on quality-held, blocked, or insufficient material. Execution clones the aggregate, consumes each input, produces finished stock, and appends the corresponding movements.

## Verification

Dedicated tests cover decimal requirements, invalid targets, quality hold, blocked stock, exact shortage wording, successful conversion, immutability, and rejection without mutation. Output evals grade quality-hold and shortage decision clarity.
