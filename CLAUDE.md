# CLAUDE.md

Настанови для роботи в цьому репозиторії — див. [AGENTS.md](AGENTS.md).

Стисло: реалізуй тільки вимоги зі статусом `accepted` у [docs/prd.md](docs/prd.md);
усе запускай у Docker (`docker compose run --rm app …`); готовність capability =
зелені тести; кожен capability — окремий OpenSpec change (propose → apply → sync →
archive). Повний перелік правил, робочий процес і команди — в AGENTS.md.
