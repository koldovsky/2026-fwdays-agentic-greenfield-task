#!/usr/bin/env bash
# Quality gate — runs on every agent Stop.
# Exit 2 blocks the agent and feeds stderr back as a message to Claude.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

failed=()
output=""

# ── 1. go vet ────────────────────────────────────────────────────────────────
if ! result=$(go vet ./... 2>&1); then
    failed+=("go vet")
    output+="=== go vet errors ===\n${result}\n\n"
fi

# ── 2. golangci-lint ─────────────────────────────────────────────────────────
if ! result=$(make lint 2>&1); then
    failed+=("lint")
    output+="=== golangci-lint errors ===\n${result}\n\n"
fi

# ── 3. go test ───────────────────────────────────────────────────────────────
if ! result=$(go test ./... -race -count=1 2>&1); then
    failed+=("tests")
    output+="=== test failures ===\n${result}\n\n"
fi

# ── Result ───────────────────────────────────────────────────────────────────
if [ ${#failed[@]} -gt 0 ]; then
    joined=$(IFS=", "; echo "${failed[*]}")
    printf "%b" "$output" >&2
    echo "" >&2
    echo "QUALITY GATE FAILED: $joined" >&2
    echo "" >&2
    echo "Fix all errors above before finishing." >&2
    exit 2
fi

echo "Quality gate passed: vet + lint + test green." >&2
exit 0
