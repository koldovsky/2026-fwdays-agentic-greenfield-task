# End-to-end verification loop (Windows / PowerShell).
# Proves the whole stack works: Postgres up -> backend lint/types/migrations/tests (incl. DB)
# -> frontend typecheck+build. Hard-fails on the first broken step.
# Usage:  powershell -File scripts/verify.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

function Assert-LastExit($what) {
    if ($LASTEXITCODE -ne 0) { throw "FAILED: $what (exit $LASTEXITCODE)" }
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
    python -m venv .venv; Assert-LastExit "venv"
    & $py -m pip install --quiet --upgrade pip; Assert-LastExit "pip upgrade"
    & $py -m pip install --quiet -e ".[dev]"; Assert-LastExit "pip install"

    Write-Host "==> [3/4] Backend: lint + types + migrations + tests (with DB)" -ForegroundColor Cyan
    & $py -m ruff check .; Assert-LastExit "ruff"
    & $py -m mypy app; Assert-LastExit "mypy"
    & $py -m alembic upgrade head; Assert-LastExit "alembic"
    $env:RUN_DB_TESTS = "1"
    & $py -m pytest -q; Assert-LastExit "pytest"
}
finally {
    Pop-Location
}

Push-Location "$root/frontend"
try {
    Write-Host "==> [4/4] Frontend: install + typecheck + build" -ForegroundColor Cyan
    npm install; Assert-LastExit "npm install"
    npm run build; Assert-LastExit "npm build"
}
finally {
    Pop-Location
}

Write-Host "==> Verification complete - stack wired end-to-end. OK" -ForegroundColor Green
