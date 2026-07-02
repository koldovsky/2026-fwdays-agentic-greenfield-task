"""Timestamp formatting utilities."""


def format_timestamp(seconds: float) -> str:
    """Format seconds as MM:SS or HH:MM:SS."""
    total = max(0, int(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def generate_interval_blocks(
    duration_seconds: float,
    interval_seconds: int,
) -> list[tuple[float, float]]:
    """Generate contiguous timestamp blocks for the given duration."""
    if duration_seconds <= 0:
        return [(0.0, float(interval_seconds))]

    blocks: list[tuple[float, float]] = []
    start = 0.0
    while start < duration_seconds:
        end = min(start + interval_seconds, duration_seconds)
        blocks.append((start, end))
        start += interval_seconds
    return blocks
