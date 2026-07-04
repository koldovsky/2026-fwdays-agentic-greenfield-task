import pytest

from bot.reminder_time import ReminderTimeError, parse_reminder_time


def test_parse_reminder_time_zero_pads_hour():
    assert parse_reminder_time("9:00") == "09:00"


def test_parse_reminder_time_accepts_valid_times():
    assert parse_reminder_time("09:30") == "09:30"
    assert parse_reminder_time("23:59") == "23:59"
    assert parse_reminder_time("00:00") == "00:00"


def test_parse_reminder_time_rejects_invalid_format():
    with pytest.raises(ReminderTimeError, match="invalid_format"):
        parse_reminder_time("9")
    with pytest.raises(ReminderTimeError, match="invalid_format"):
        parse_reminder_time("ab:cd")


def test_parse_reminder_time_rejects_out_of_range():
    with pytest.raises(ReminderTimeError, match="out_of_range"):
        parse_reminder_time("24:00")
    with pytest.raises(ReminderTimeError, match="out_of_range"):
        parse_reminder_time("12:60")
