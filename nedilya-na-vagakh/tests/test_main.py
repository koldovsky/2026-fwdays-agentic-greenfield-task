from bot.config import Config
from bot.main import build_application


def test_build_application_initializes():
    config = Config(
        bot_token="test-token",
        allowed_user_ids=frozenset({12345}),
        database_path=":memory:",
    )

    application = build_application(config)

    assert application.bot_data["allowed_user_ids"] == frozenset({12345})
    assert application.bot_data["database_path"] == ":memory:"
