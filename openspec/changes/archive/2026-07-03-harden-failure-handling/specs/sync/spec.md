# sync — spec

## ADDED Requirements

### Requirement: Watcher is resilient to transient failures and bad config

The sync watch loop SHALL survive a failed reconciliation pass — logging it and continuing — so continuous sync is not silently killed by a transient error. Invalid interval configuration SHALL fall back to the default rather than crashing startup.

#### Scenario: A failed pass does not stop the watcher

- **WHEN** a reconciliation pass raises an error during the watch loop
- **THEN** the error is logged and the loop continues with subsequent passes

#### Scenario: Invalid interval falls back to default

- **WHEN** the configured sync interval is non-numeric or not positive
- **THEN** the watcher uses the default interval instead of failing to start
