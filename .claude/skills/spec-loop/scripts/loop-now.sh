#!/usr/bin/env bash
# The ONE canonical timestamp for the loop.
#
# Every STATE.md entry is stamped by calling this script, so timestamps are identical in
# format and timezone regardless of which agent or machine wrote them. State that can't be
# compared across runs isn't a spine — it's noise.
#
# The timezone is the PROJECT's choice via LOOP_TZ (set in loop.config.sh at the repo
# root); it defaults to UTC so the skill itself hard-codes no team's local time.
#
# Output example: 2026-06-28 21:15:03 UTC
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
[ -f "$ROOT/loop.config.sh" ] && . "$ROOT/loop.config.sh"
TZ="${LOOP_TZ:-UTC}" date '+%Y-%m-%d %H:%M:%S %Z'
