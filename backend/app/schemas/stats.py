"""Stats response schemas (Pydantic v2), separate from the pure core (app/core).

``app/core/snapshot.py`` and ``app/core/metrics/heatmap.py`` return plain
dicts/dataclasses with native ``datetime.date`` values (framework-free, NFR-DET-01);
these response models are the thin API-layer step that turns those into wire-format JSON
(``date`` serializes to a plain ISO ``YYYY-MM-DD`` string by default -- no custom
serializer needed, unlike the timezone-aware ``datetime`` fields in
``app/schemas/sessions.py``), per architecture §1's "core is pure / api is thin" split.
Field names mirror the snapshot dict keys exactly so a route can return the service's
plain dict straight against ``response_model=SnapshotResponse``.
"""

from datetime import date

from pydantic import BaseModel

from app.core.metrics.heatmap import HeatmapDay


class WindowRead(BaseModel):
    """The reporting range a snapshot's window-scoped blocks cover."""

    start: date
    end: date
    days: int


class DailyMinRead(BaseModel):
    """One zero-filled day of a ``per_day`` net-minute series."""

    date: date
    min: int


class VolumeRead(BaseModel):
    today_min: int
    week_min: int
    month_min: int
    all_time_min: int
    daily_avg_30d_min: float
    per_day: list[DailyMinRead]


class ConsistencyRead(BaseModel):
    score: int | None
    low_confidence: bool
    regularity: float | None
    start_stability: float | None
    median_start_local: str | None


class FocusRead(BaseModel):
    deep_count: int
    deep_minutes: int
    deep_share: float


class SwitchDayRead(BaseModel):
    date: date
    switches: int
    interruptions: int
    switch_load: int
    flagged: bool


class SwitchingRead(BaseModel):
    per_day: list[SwitchDayRead]
    baseline_mean: float


class StreaksRead(BaseModel):
    current: int
    longest: int


class BaselineEntryRead(BaseModel):
    value: float
    delta: float | None
    zone: str


class BaselinesRead(BaseModel):
    volume: BaselineEntryRead
    consistency: BaselineEntryRead
    focus_share: BaselineEntryRead
    switch_load: BaselineEntryRead


class TopCategoryRead(BaseModel):
    id: int
    name: str
    color: str
    week_min: int


class CategoryPerDayRead(BaseModel):
    id: int
    name: str
    color: str
    per_day: list[DailyMinRead]


class SnapshotResponse(BaseModel):
    """The full architecture §4.1 snapshot -- the payload of ``GET /api/stats/snapshot``."""

    window: WindowRead
    volume: VolumeRead
    consistency: ConsistencyRead
    focus: FocusRead
    switching: SwitchingRead
    streaks: StreaksRead
    baselines: BaselinesRead
    top_categories: list[TopCategoryRead]
    per_category_per_day: list[CategoryPerDayRead]


class HeatmapDayRead(BaseModel):
    date: date
    min: int
    level: int

    @classmethod
    def from_core(cls, entry: HeatmapDay) -> "HeatmapDayRead":
        return cls(date=entry.day, min=entry.net_minutes, level=entry.level)


class HeatmapResponse(BaseModel):
    """The bucketed activity-heatmap grid -- the payload of ``GET /api/stats/heatmap``."""

    period: str
    days: list[HeatmapDayRead]
