import pytest

from bot.config import ConfigError, load_config


def test_load_config_parses_allowlist():
    config = load_config(
        {
            "BOT_TOKEN": "test-token",
            "ALLOWED_USER_IDS": "12345, 67890",
            "DATABASE_PATH": ":memory:",
        }
    )

    assert config.bot_token == "test-token"
    assert config.allowed_user_ids == frozenset({12345, 67890})
    assert config.database_path == ":memory:"


def test_load_config_defaults_database_path():
    config = load_config(
        {
            "BOT_TOKEN": "test-token",
            "ALLOWED_USER_IDS": "1",
        }
    )

    assert config.database_path == "./data/bot.db"


def test_load_config_missing_bot_token():
    with pytest.raises(ConfigError, match="BOT_TOKEN"):
        load_config({"ALLOWED_USER_IDS": "1"})


def test_load_config_missing_allowlist():
    with pytest.raises(ConfigError, match="ALLOWED_USER_IDS"):
        load_config({"BOT_TOKEN": "test-token"})


def test_load_config_reads_dotenv_file(tmp_path, monkeypatch):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "BOT_TOKEN=file-token\nALLOWED_USER_IDS=42\n",
        encoding="utf-8",
    )
    monkeypatch.setattr("bot.config._ENV_FILE", env_file)
    monkeypatch.delenv("BOT_TOKEN", raising=False)
    monkeypatch.delenv("ALLOWED_USER_IDS", raising=False)

    config = load_config()

    assert config.bot_token == "file-token"
    assert config.allowed_user_ids == frozenset({42})


def test_load_config_invalid_allowlist_value():
    with pytest.raises(ConfigError, match="invalid value"):
        load_config(
            {
                "BOT_TOKEN": "test-token",
                "ALLOWED_USER_IDS": "abc",
            }
        )
