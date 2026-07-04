## MODIFIED Requirements

### Requirement: Help command lists commands and input format

The `/допомога` command SHALL reply in Ukrainian with the bot's command roster and the weigh-in
input format including an example. (FR-MSG-08)

#### Scenario: Help text includes commands

- **WHEN** an allowlisted user sends `/допомога`
- **THEN** the bot replies listing available commands including `/вага`, `/скасувати`, `/допомога`,
  `/прогрес`, `/історія`, `/місяць`, `/весь_час`, and `/налаштування`

#### Scenario: Help text includes weigh-in format

- **WHEN** an allowlisted user sends `/допомога`
- **THEN** the reply explains the four-number weigh-in format with an example such as
  `72,4 28,5 32,1 24,8`
