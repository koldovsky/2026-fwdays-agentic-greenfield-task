"""Pipeline timing and debug logging helpers."""

from __future__ import annotations

import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from pydub import AudioSegment


def format_bytes(size_bytes: int) -> str:
    """Return a human-readable byte size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / (1024 * 1024):.2f} MB"


def format_context(context: dict[str, Any]) -> str:
    """Format key=value pairs for log messages."""
    if not context:
        return ""
    return " | ".join(f"{key}={value}" for key, value in context.items())


def audio_file_metrics(path: Path) -> dict[str, Any]:
    """Collect duration and size metrics for an audio file."""
    segment = AudioSegment.from_file(path)
    size_bytes = path.stat().st_size
    duration_seconds = len(segment) / 1000.0
    return {
        "path": str(path),
        "duration_seconds": duration_seconds,
        "size_bytes": size_bytes,
        "size_human": format_bytes(size_bytes),
    }


def log_audio_file_metrics(logger: Any, label: str, path: Path) -> dict[str, Any]:
    """Log extracted audio duration and file size."""
    metrics = audio_file_metrics(path)
    logger.info(
        "[audio] %s | duration=%.3fs | size=%s (%s bytes)",
        label,
        metrics["duration_seconds"],
        metrics["size_human"],
        metrics["size_bytes"],
    )
    return metrics


def log_chunk_metrics(
    logger: Any,
    *,
    chunk_index: int,
    start_seconds: float,
    end_seconds: float,
    size_bytes: int,
) -> None:
    """Log per-chunk duration and size."""
    logger.info(
        "[chunk] index=%s | duration=%.3fs | start=%.3fs | end=%.3fs | size=%s (%s bytes)",
        chunk_index,
        end_seconds - start_seconds,
        start_seconds,
        end_seconds,
        format_bytes(size_bytes),
        size_bytes,
    )


@contextmanager
def log_step(logger: Any, step: str, **context: Any) -> Iterator[dict[str, Any]]:
    """Log step start/end with elapsed duration and optional context."""
    step_context: dict[str, Any] = {}
    suffix = format_context(context)
    logger.info("[timing] %s started%s", step, f" | {suffix}" if suffix else "")
    started = time.perf_counter()
    status = "completed"
    try:
        yield step_context
    except Exception:
        status = "failed"
        raise
    finally:
        elapsed = time.perf_counter() - started
        final_status = step_context.pop("status", status)
        merged = {**context, **step_context, "status": final_status}
        logger.info(
            "[timing] %s %s | duration=%.3fs | %s",
            step,
            final_status,
            elapsed,
            format_context(merged),
        )
