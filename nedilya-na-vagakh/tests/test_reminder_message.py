from bot.reminder_message import REMINDER_BODY, format_reminder_message


def test_format_reminder_message_with_name():
    message = format_reminder_message("Оленка")
    assert message.startswith("Оленка,")
    assert "/вага" in message
    assert REMINDER_BODY in message


def test_format_reminder_message_without_name():
    message = format_reminder_message(None)
    assert message == REMINDER_BODY
    assert "/вага" in message


def test_format_reminder_message_ignores_blank_name():
    message = format_reminder_message("   ")
    assert message == REMINDER_BODY
