# Quality gate — runs on every agent Stop.
# Exit 2 blocks the agent and feeds output back as a message to Claude.

$root = Split-Path $PSScriptRoot -Parent | Split-Path -Parent
Set-Location $root

$failed = @()
$output = @()

# ── 1. TypeScript ──────────────────────────────────────────────────────────────
$tsc = & npx tsc --noEmit 2>&1
if ($LASTEXITCODE -ne 0) {
    $failed += "TypeScript"
    $output += "=== TypeScript errors ==="
    $output += $tsc
}

# ── 2. ESLint ─────────────────────────────────────────────────────────────────
$eslint = & npx eslint . 2>&1
if ($LASTEXITCODE -ne 0) {
    $failed += "ESLint"
    $output += "=== ESLint errors ==="
    $output += $eslint
}

# ── 3. Prettier ───────────────────────────────────────────────────────────────
$prettier = & npx prettier --check . 2>&1
if ($LASTEXITCODE -ne 0) {
    $failed += "Prettier"
    $output += "=== Prettier formatting issues (run: npx prettier --write .) ==="
    $output += $prettier
}

# ── 4. Vitest ─────────────────────────────────────────────────────────────────
$tests = & npx vitest run 2>&1
if ($LASTEXITCODE -ne 0) {
    $failed += "Tests"
    $output += "=== Vitest failures ==="
    $output += $tests
}

# ── Result ────────────────────────────────────────────────────────────────────
if ($failed.Count -gt 0) {
    $failedList = $failed -join ", "
    [Console]::Error.WriteLine($output -join "`n")
    [Console]::Error.WriteLine("")
    [Console]::Error.WriteLine("QUALITY GATE FAILED: $failedList")
    [Console]::Error.WriteLine("")
    [Console]::Error.WriteLine("Fix all errors above before finishing.")
    [Console]::Error.WriteLine("- TypeScript: fix type issues in the flagged files.")
    [Console]::Error.WriteLine("- ESLint: fix lint violations (npx eslint --fix . for auto-fixable).")
    [Console]::Error.WriteLine("- Prettier: run npx prettier --write . then review the diff.")
    [Console]::Error.WriteLine("- Tests: fix the failing tests or the code they cover.")
    exit 2
}

[Console]::Error.WriteLine("Quality gate passed.")
exit 0
