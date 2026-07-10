#!/usr/bin/env bash
# Deterministic wall-clock for the impeccable score loop. The model NEVER computes time itself.
#
#   ./clock.sh          # full status block
#   ./clock.sh --phase  # just the phase word (IMPROVE|WRAP|DEMO|FINALIZE|STOP)
#
# Phases (Europe/Kyiv):
#   IMPROVE   ..< 06:50   audit -> fix -> re-audit cycles
#   WRAP      06:50-07:00 finish + commit the in-flight cycle, start nothing new
#   DEMO      07:00-07:50 record the demo video
#   FINALIZE  07:50-08:00 write the final report, commit
#   STOP      >= 08:00    hard stop
set -euo pipefail

python3 - "${1:-}" <<'PY'
import datetime, sys, zoneinfo

KYIV = zoneinfo.ZoneInfo("Europe/Kyiv")
now = datetime.datetime.now(KYIV)


def at(h, m):
    """Today's h:m, or tomorrow's if it has already passed relative to the run's start-of-day."""
    t = now.replace(hour=h, minute=m, second=0, microsecond=0)
    return t


improve_end = at(6, 50)
demo_start = at(7, 0)
finalize = at(7, 50)
stop = at(8, 0)

# If we're already past the stop time, every boundary belongs to tomorrow.
if now >= stop:
    day = datetime.timedelta(days=1)
    improve_end, demo_start, finalize, stop = (b + day for b in (improve_end, demo_start, finalize, stop))
    phase = "STOP"
elif now < improve_end:
    phase = "IMPROVE"
elif now < demo_start:
    phase = "WRAP"
elif now < finalize:
    phase = "DEMO"
else:
    phase = "FINALIZE"


def secs(target):
    return max(0, int((target - now).total_seconds()))


def hm(s):
    return f"{s // 3600}h{(s % 3600) // 60:02d}m"


if len(sys.argv) > 1 and sys.argv[1] == "--phase":
    print(phase)
    sys.exit(0)

print(f"KYIV_NOW={now:%Y-%m-%d %H:%M:%S %Z}")
print(f"PHASE={phase}")
print(f"SECONDS_TO_IMPROVE_END={secs(improve_end)}   ({hm(secs(improve_end))})")
print(f"SECONDS_TO_DEMO={secs(demo_start)}   ({hm(secs(demo_start))})")
print(f"SECONDS_TO_STOP={secs(stop)}   ({hm(secs(stop))})")
print()
print(
    {
        "IMPROVE": "Run another audit -> fix -> re-audit cycle. Check the clock again before starting one.",
        "WRAP": "Do NOT start a new cycle. Finish and commit what is in flight.",
        "DEMO": "Stop improving. Record the demo video now.",
        "FINALIZE": "Write the final report and commit. No new work.",
        "STOP": "Deadline passed. Stop immediately and report.",
    }[phase]
)
PY
