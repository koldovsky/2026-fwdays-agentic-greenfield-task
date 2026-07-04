import pytest

from bot.name_validation import (
    MAX_DISPLAY_NAME_LENGTH,
    NameValidationError,
    validate_display_name,
)


def test_validate_display_name_trims_whitespace():
    assert validate_display_name("  Оленка  ") == "Оленка"


def test_validate_display_name_rejects_empty():
    with pytest.raises(NameValidationError, match="empty"):
        validate_display_name("")
    with pytest.raises(NameValidationError, match="empty"):
        validate_display_name("   ")


def test_validate_display_name_rejects_too_long():
    too_long = "а" * (MAX_DISPLAY_NAME_LENGTH + 1)
    with pytest.raises(NameValidationError, match="too_long"):
        validate_display_name(too_long)


def test_validate_display_name_accepts_max_length():
    exact = "а" * MAX_DISPLAY_NAME_LENGTH
    assert validate_display_name(exact) == exact
