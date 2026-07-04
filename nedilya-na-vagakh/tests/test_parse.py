import pytest

from bot.parse import ParsedWeighIn, ParseError, parse_weigh_in


def test_parse_space_separated_comma_decimals():
    result = parse_weigh_in("72,4 28,5 32,1 24,8")

    assert result == ParsedWeighIn(72.4, 28.5, 32.1, 24.8)


def test_parse_dot_decimals():
    result = parse_weigh_in("72.4 28.5 32.1 24.8")

    assert result == ParsedWeighIn(72.4, 28.5, 32.1, 24.8)


def test_parse_newline_separated():
    result = parse_weigh_in("72,4\n28,5\n32,1\n24,8")

    assert result == ParsedWeighIn(72.4, 28.5, 32.1, 24.8)


def test_parse_trims_whitespace():
    result = parse_weigh_in("  72,4  28,5  32,1  24,8  ")

    assert result.weight_kg == 72.4


def test_parse_wrong_token_count():
    with pytest.raises(ParseError) as exc:
        parse_weigh_in("72,4 28,5")
    assert exc.value.kind == "count"


def test_parse_non_numeric():
    with pytest.raises(ParseError) as exc:
        parse_weigh_in("abc def ghi jkl")
    assert exc.value.kind == "non_numeric"


@pytest.mark.parametrize("token", ["inf", "-inf", "nan", "1e400"])
def test_parse_rejects_non_finite(token):
    with pytest.raises(ParseError) as exc:
        parse_weigh_in(f"{token} 28,5 32,1 24,8")
    assert exc.value.kind == "non_numeric"


@pytest.mark.parametrize(
    "text",
    [
        "0 28,5 32,1 24,8",  # weight too low / zero
        "-5 28,5 32,1 24,8",  # negative weight
        "500 28,5 32,1 24,8",  # weight too high
        "72,4 0 32,1 24,8",  # fat too low
        "72,4 150 32,1 24,8",  # fat too high
        "72,4 28,5 32,1 3",  # bmi too low
        "72,4 28,5 32,1 200",  # bmi too high
    ],
)
def test_parse_rejects_out_of_range(text):
    with pytest.raises(ParseError) as exc:
        parse_weigh_in(text)
    assert exc.value.kind == "out_of_range"


def test_parse_accepts_boundary_values():
    result = parse_weigh_in("20 1 1 5")
    assert result == ParsedWeighIn(20.0, 1.0, 1.0, 5.0)
