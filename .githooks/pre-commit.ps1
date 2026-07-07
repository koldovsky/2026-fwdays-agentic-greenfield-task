$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

function Invoke-Step([string] $Name, [scriptblock] $Command) {
    Write-Host "==> $Name"
    & $Command
    if ($LASTEXITCODE -ne 0) {
        throw "$Name failed with exit code $LASTEXITCODE"
    }
}

Invoke-Step "dotnet format" {
    dotnet format "TrafficSignScanner.slnx" --verify-no-changes
}

Invoke-Step "build Core" {
    dotnet build "src/TrafficSignScanner.Core/TrafficSignScanner.Core.csproj" --no-restore
}

Invoke-Step "build MCP" {
    dotnet build "src/TrafficSignScanner.Mcp/TrafficSignScanner.Mcp.csproj" --no-restore
}

Invoke-Step "test MCP" {
    dotnet test "tests/TrafficSignScanner.Mcp.Tests/TrafficSignScanner.Mcp.Tests.csproj"
}

Invoke-Step "test Core" {
    dotnet test "tests/TrafficSignScanner.Core.Tests/TrafficSignScanner.Core.Tests.csproj"
}

Invoke-Step "test eval harness" {
    dotnet test "evals/TrafficSignScanner.Evals/TrafficSignScanner.Evals.csproj"
}

Invoke-Step "traceability check" {
    dotnet run "scripts/check-traceability.cs"
}

Invoke-Step "eval ratchet check" {
    dotnet run "scripts/check-eval-ratchet.cs"
}

Invoke-Step "coverage ratchet check" {
    dotnet run "scripts/check-coverage-ratchet.cs"
}

Invoke-Step "gate status check" {
    dotnet run "scripts/check-gate-status.cs"
}

$stagedFiles = git diff --cached --name-only --diff-filter=ACM
$secretPattern = '(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*["''][^"'']{8,}'

foreach ($file in $stagedFiles) {
    if (-not (Test-Path $file) -or (Get-Item $file).PSIsContainer) {
        continue
    }

    $match = Select-String -Path $file -Pattern $secretPattern -Quiet
    if ($match) {
        Write-Error "Potential secret detected in staged file: $file"
        exit 1
    }
}

Write-Host "Pre-commit checks passed."
