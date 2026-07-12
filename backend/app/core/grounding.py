"""Pure grounding validator for coach output (FR-COACH-02, architecture §4.4).

Framework-free — no FastAPI / SQLAlchemy / I/O at import, like ``app/core/snapshot.py`` —
so it is unit-testable and reused **verbatim** by the eval suite. The product promise is
that every number the coach cites traces to a number the metrics snapshot already carries;
this module makes that mechanical (O-7 resolution).

``check_grounding`` builds the **allowed-number set** deterministically from the shipped
``SnapshotResponse`` leaves (so two implementers derive the identical set), then extracts
numeric tokens from the coach text and flags any that is neither in the allowed set, nor a
number the user themselves cited in their current chat message, nor a bare integer 0-9
without units (§4.4 item 3). The allowed set is enumerated by **unit type**:

- every numeric leaf at raw ``v`` / ``round(v)`` / ``round(v, 1)`` (the catch-all);
- **share-typed** leaves (``focus.deep_share``, ``baselines.focus_share.value``/``.delta``)
  additionally as a percent — ``round(v*100)`` / ``round(v*100, 1)``;
- **minute-typed** leaves (every ``*_min``, ``focus.deep_minutes``,
  ``volume.daily_avg_30d_min``, every ``per_day[].min``, ``top_categories[].week_min``,
  ``baselines.volume.value``/``.delta``) additionally as ``h:mm`` from both ``floor(v)`` and
  ``round(v)`` minutes;
- ``consistency.median_start_local`` (non-null) as its ``HH:MM`` literal;
- **date components are excluded** entirely (they are dates, not numeric tokens).

Where a rounding choice exists BOTH the floored and rounded rendering are included, so a
legitimate rendering of an ordinary-week number is never a false positive while a fabricated
number still fails. A ``null`` (low-confidence) leaf contributes nothing (§3.2).
"""

import re
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from math import floor

# Times (``h:mm`` durations / ``HH:MM`` clock) and percents are matched BEFORE bare numbers
# so "4:22" and "43%" are read whole, not split into "4"/"22"/"43".
_TOKEN_RE = re.compile(r"(?P<time>\d{1,2}:\d{2})|(?P<pct>\d+(?:\.\d+)?%)|(?P<num>\d+(?:\.\d+)?)")
_BARE_DIGIT_RE = re.compile(r"[0-9]")


@dataclass(frozen=True)
class GroundingResult:
    """The outcome of a grounding check: is-grounded plus the offending numeric tokens."""

    grounded: bool
    violations: list[str]


def _to_float(value: object) -> float | None:
    """The numeric value as a float, or None for null / non-numeric / bool leaves."""
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _canon_number(value: float) -> str:
    """Canonical string for a number: integral values drop the ``.0`` tail (74.0 -> "74")."""
    if value == int(value):
        return str(int(value))
    return repr(value)


def _canon_time(token: str) -> str | None:
    """Canonical ``H:MM`` form (hour without a leading zero); None if not a time token."""
    parts = token.split(":")
    if len(parts) != 2:
        return None
    try:
        hours, minutes = int(parts[0]), int(parts[1])
    except ValueError:
        return None
    return f"{hours}:{minutes:02d}"


def _as_map(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _as_seq(value: object) -> Sequence[object]:
    return value if isinstance(value, (list, tuple)) else []


class _Allowed:
    """The allowed-number set, split by token shape so extraction can match by kind."""

    def __init__(self) -> None:
        self.nums: set[str] = set()
        self.pcts: set[str] = set()
        self.times: set[str] = set()

    def plain(self, value: object) -> None:
        """The catch-all renderings every numeric leaf gets: raw, round, one-decimal."""
        number = _to_float(value)
        if number is None:
            return
        self.nums.add(_canon_number(number))
        self.nums.add(_canon_number(round(number)))
        self.nums.add(_canon_number(round(number, 1)))

    def minute(self, value: object) -> None:
        """A minute quantity: the catch-all plus ``h:mm`` from floor and round minutes."""
        number = _to_float(value)
        if number is None:
            return
        self.plain(number)
        for minutes in {floor(number), round(number)}:
            if minutes < 0:
                continue
            hours, mins = divmod(int(minutes), 60)
            self.times.add(f"{hours}:{mins:02d}")

    def share(self, value: object) -> None:
        """A 0..1 share: the catch-all plus a percent at round and one-decimal granularity."""
        number = _to_float(value)
        if number is None:
            return
        self.plain(number)
        self.pcts.add(_canon_number(round(number * 100)) + "%")
        self.pcts.add(_canon_number(round(number * 100, 1)) + "%")

    def time_literal(self, value: object) -> None:
        """A non-null local-time leaf (``median_start_local``) as its ``HH:MM`` literal."""
        if not isinstance(value, str):
            return
        canon = _canon_time(value)
        if canon is not None:
            self.times.add(canon)


def _collect_baseline(entry: object, adder: Callable[[object], None]) -> None:
    """Add a ``baselines.*`` entry's ``value`` and ``delta`` via its unit-typed adder."""
    entry_map = _as_map(entry)
    adder(entry_map.get("value"))
    adder(entry_map.get("delta"))


def _collect(snapshot: Mapping[str, object], allowed: _Allowed) -> None:
    """Enumerate the allowed-number set from the real ``SnapshotResponse`` leaves (§4.4)."""
    window = _as_map(snapshot.get("window"))
    allowed.plain(window.get("days"))  # window.start / .end are dates -> excluded

    volume = _as_map(snapshot.get("volume"))
    for key in ("today_min", "week_min", "month_min", "all_time_min", "daily_avg_30d_min"):
        allowed.minute(volume.get(key))
    for row in _as_seq(volume.get("per_day")):
        allowed.minute(_as_map(row).get("min"))

    consistency = _as_map(snapshot.get("consistency"))
    for key in ("score", "regularity", "start_stability"):
        allowed.plain(consistency.get(key))
    allowed.time_literal(consistency.get("median_start_local"))

    focus = _as_map(snapshot.get("focus"))
    allowed.plain(focus.get("deep_count"))
    allowed.minute(focus.get("deep_minutes"))
    allowed.share(focus.get("deep_share"))

    switching = _as_map(snapshot.get("switching"))
    for row in _as_seq(switching.get("per_day")):
        row_map = _as_map(row)
        for key in ("switches", "interruptions", "switch_load"):
            allowed.plain(row_map.get(key))
    allowed.plain(switching.get("baseline_mean"))

    streaks = _as_map(snapshot.get("streaks"))
    allowed.plain(streaks.get("current"))
    allowed.plain(streaks.get("longest"))

    baselines = _as_map(snapshot.get("baselines"))
    _collect_baseline(baselines.get("volume"), allowed.minute)
    _collect_baseline(baselines.get("consistency"), allowed.plain)
    _collect_baseline(baselines.get("focus_share"), allowed.share)
    _collect_baseline(baselines.get("switch_load"), allowed.plain)

    for cat in _as_seq(snapshot.get("top_categories")):
        cat_map = _as_map(cat)
        allowed.plain(cat_map.get("id"))
        allowed.minute(cat_map.get("week_min"))

    for cat in _as_seq(snapshot.get("per_category_per_day")):
        cat_map = _as_map(cat)
        allowed.plain(cat_map.get("id"))
        for row in _as_seq(cat_map.get("per_day")):
            allowed.minute(_as_map(row).get("min"))


def _tokens(text: str) -> list[tuple[str, str]]:
    """Extract ``(kind, raw)`` numeric tokens (time / percent / plain) from ``text``."""
    out: list[tuple[str, str]] = []
    for match in _TOKEN_RE.finditer(text):
        if match.group("time") is not None:
            out.append(("time", match.group("time")))
        elif match.group("pct") is not None:
            out.append(("pct", match.group("pct")))
        else:
            out.append(("num", match.group("num")))
    return out


def _extend_from_message(message: str, allowed: _Allowed) -> None:
    """Widen the allowed set with numbers the user cited in their current chat message."""
    for kind, raw in _tokens(message):
        if kind == "time":
            canon = _canon_time(raw)
            if canon is not None:
                allowed.times.add(canon)
        elif kind == "pct":
            allowed.pcts.add(_canon_number(float(raw[:-1])) + "%")
        else:
            allowed.nums.add(_canon_number(float(raw)))


def _token_ok(kind: str, raw: str, allowed: _Allowed) -> bool:
    """True if a single extracted token is grounded (in the allowed set or exempt)."""
    if kind == "time":
        canon = _canon_time(raw)
        return canon is not None and canon in allowed.times
    if kind == "pct":
        return _canon_number(float(raw[:-1])) + "%" in allowed.pcts
    if _BARE_DIGIT_RE.fullmatch(raw):  # a bare integer 0-9 without units is exempt (§4.4)
        return True
    return _canon_number(float(raw)) in allowed.nums


def check_grounding(
    snapshot: Mapping[str, object],
    text: str,
    *,
    user_message: str | None = None,
) -> GroundingResult:
    """Validate ``text`` against ``snapshot`` (FR-COACH-02).

    Returns a ``GroundingResult`` whose ``violations`` are the offending numeric tokens
    (empty when grounded). ``user_message`` (chat path) widens the allowed set with the
    numbers the user themselves cited.
    """
    allowed = _Allowed()
    _collect(snapshot, allowed)
    if user_message:
        _extend_from_message(user_message, allowed)

    violations = [raw for kind, raw in _tokens(text) if not _token_ok(kind, raw, allowed)]
    return GroundingResult(grounded=not violations, violations=violations)
