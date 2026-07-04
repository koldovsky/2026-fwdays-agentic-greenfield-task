## ADDED Requirements

### Requirement: Telegram command menu registration

On startup, the bot SHALL register the canonical v1 command roster with Telegram via
`set_my_commands` so the menu appears in the Telegram client. (FR-CMD-01)

#### Scenario: Command menu set after application build

- **WHEN** the bot application is built and the post-init hook runs
- **THEN** `set_my_commands` is called with `BotCommand` entries matching the canonical roster
  command names and Ukrainian descriptions

#### Scenario: Menu registration uses Ukrainian descriptions

- **WHEN** `set_my_commands` is invoked at startup
- **THEN** every registered command description is non-empty Ukrainian text
