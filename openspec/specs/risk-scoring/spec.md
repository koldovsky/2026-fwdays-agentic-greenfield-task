# Capability: risk-scoring

Deterministic risk scoring and ranking of Terraform resource changes.

## Scenario: score a destructive change to a stateful resource (FR-SCORE-01, FR-RISK-01)

- WHEN a resource change has action `delete` on type `aws_db_instance`
- THEN its score is `>= 90` (action weight 40 + risky-delete weight 50)
- AND it is classified `high` risk (threshold 70)

## Scenario: score a create missing required tags (FR-SCORE-01, FR-TAGS-01)

- WHEN a resource change has action `create` and is missing the `owner` tag
- THEN the `missing-required-tags` finding contributes weight 20
- AND the total score is `25` (action weight 5 + 20)

## Scenario: ranking is stable (FR-SCORE-02)

- WHEN two findings have equal scores
- THEN they are ordered by resource address alphabetically (ascending)

## Scenario: summary never contradicts the score (FR-OUT-02)

- WHEN a finding's score is at/above the high-risk threshold
- THEN its summary line does NOT describe the resource as "safe" or "ok"
- AND the line length is `<= 100` characters
