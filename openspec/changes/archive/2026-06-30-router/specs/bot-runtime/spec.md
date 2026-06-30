## ADDED Requirements

### Requirement: Non-command messages route through the classifier
The long-poll handler SHALL pass non-command text messages to the message router and act on the
returned intent, instead of only handling the `/start` command. The first wired consumer MAY be the
`query`/echo path; later changes attach the remaining intent handlers. Commands (e.g. `/start`)
SHALL continue to be handled directly without a router call.

#### Scenario: A text message is routed
- **WHEN** a user sends a non-command text message
- **THEN** the handler invokes the router classifier and dispatches on the returned `intent`

#### Scenario: Commands bypass the router
- **WHEN** a user sends `/start`
- **THEN** the command handler runs directly, with no classification call
