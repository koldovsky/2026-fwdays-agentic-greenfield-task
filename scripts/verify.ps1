# End-to-end verification loop (Windows / PowerShell).
# Proves the whole stack works: Postgres up -> backend lint/types/migrations/tests (incl. DB)
# -> frontend typecheck+build. Hard-fails on the first broken step.
# Usage:  powershell -File scripts/verify.ps1
#
# Env knobs (no check is ever weakened; these only remove REPEATED work):
#   VERIFY_FRESH=1        force venv/pip/npm reinstall even if dep manifests are unchanged
#   VERIFY_SKIP_PYTEST=1  skip the plain pytest step - ONLY for callers that run the exact
#                         same suite themselves immediately after (gate-slice's coverage run)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Assert-LastExit($what) {
    if ($LASTEXITCODE -ne 0) { throw "FAILED: $what (exit $LASTEXITCODE)" }
}

function Test-DepsStamp($stampPath, $manifestPath) {
    # True when the stamp records the manifest's current hash (deps unchanged).
    if ($env:VERIFY_FRESH -eq "1") { return $false }
    if (-not (Test-Path $stampPath) -or -not (Test-Path $manifestPath)) { return $false }
    $hash = (Get-FileHash -Algorithm SHA256 $manifestPath).Hash
    return ((Get-Content $stampPath -Raw).Trim() -eq $hash)
}

function Write-DepsStamp($stampPath, $manifestPath) {
    (Get-FileHash -Algorithm SHA256 $manifestPath).Hash | Set-Content -Encoding ascii $stampPath
}

Write-Host "==> [1/4] Starting PostgreSQL (docker compose up -d db)" -ForegroundColor Cyan
docker compose -f "$root/docker-compose.yml" up -d db; Assert-LastExit "docker compose up"

Write-Host "==> Waiting for PostgreSQL to become healthy" -ForegroundColor Cyan
$deadline = (Get-Date).AddSeconds(60)
do {
    Start-Sleep -Seconds 2
    $cid = docker compose -f "$root/docker-compose.yml" ps -q db
    $health = docker inspect --format "{{.State.Health.Status}}" $cid 2>$null
    Write-Host "    db health: $health"
    if ((Get-Date) -gt $deadline) { throw "PostgreSQL did not become healthy in time" }
} while ($health -ne "healthy")

$py = "$root/backend/.venv/Scripts/python.exe"
Push-Location "$root/backend"
try {
    Write-Host "==> [2/4] Backend: venv + install" -ForegroundColor Cyan
    if (-not (Test-Path $py)) {
        python -m venv .venv; Assert-LastExit "venv"
    }
    if (Test-DepsStamp ".venv/.deps-stamp" "pyproject.toml") {
        Write-Host "    deps unchanged (pyproject.toml stamp) - skipping pip install (VERIFY_FRESH=1 forces)"
    } else {
        & $py -m pip install --quiet --upgrade pip; Assert-LastExit "pip upgrade"
        & $py -m pip install --quiet -e ".[dev]"; Assert-LastExit "pip install"
        Write-DepsStamp ".venv/.deps-stamp" "pyproject.toml"
    }

    Write-Host "==> [3/4] Backend: lint + types + migrations + tests (with DB)" -ForegroundColor Cyan
    & $py -m ruff check .; Assert-LastExit "ruff"
    & $py -m mypy app; Assert-LastExit "mypy"
    & $py -m alembic upgrade head; Assert-LastExit "alembic"
    if ($env:VERIFY_SKIP_PYTEST -eq "1") {
        Write-Host "    pytest skipped (VERIFY_SKIP_PYTEST=1: the caller runs this exact suite under coverage next)"
    } else {
        $env:RUN_DB_TESTS = "1"
        & $py -m pytest -q; Assert-LastExit "pytest"
    }
}
finally {
    Pop-Location
}

Push-Location "$root/frontend"
try {
    Write-Host "==> [4/4] Frontend: install + typecheck + build + unit tests" -ForegroundColor Cyan
    if (Test-DepsStamp "node_modules/.deps-stamp" "package-lock.json") {
        Write-Host "    deps unchanged (package-lock.json stamp) - skipping npm install (VERIFY_FRESH=1 forces)"
    } else {
        npm install; Assert-LastExit "npm install"
        Write-DepsStamp "node_modules/.deps-stamp" "package-lock.json"
    }
    npm run build; Assert-LastExit "npm build"
    npm test; Assert-LastExit "npm test"
}
finally {
    Pop-Location
}

Write-Host "==> Verification complete - stack wired end-to-end. OK" -ForegroundColor Green
