$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

git config core.hooksPath .githooks

Write-Host "Git hooks configured: core.hooksPath=.githooks"
