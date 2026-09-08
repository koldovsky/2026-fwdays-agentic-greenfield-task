# Mirror canonical skills (.agents/skills) into each agent's skills directory.
# Edit skills in .agents/skills/, then run this to propagate. Windows / PowerShell.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root ".agents/skills"

# Add more agent skill directories here as you adopt other tools.
$targets = @(
    (Join-Path $root ".claude/skills")
)

foreach ($dest in $targets) {
    if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item -Recurse -Force (Join-Path $src "*") $dest
    Write-Host "synced .agents/skills -> $dest"
}
