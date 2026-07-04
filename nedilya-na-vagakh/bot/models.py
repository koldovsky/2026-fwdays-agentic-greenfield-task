from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class UserSettings:
    telegram_user_id: int
    display_name: str | None
    reminder_time: str
    reminder_timezone: str
    reminder_weekday: int
    setup_completed_at: str | None


@dataclass(frozen=True)
class WeighIn:
    id: int
    user_id: int
    recorded_at: str
    weight_kg: float
    fat_pct: float
    muscle_pct: float
    bmi: float
