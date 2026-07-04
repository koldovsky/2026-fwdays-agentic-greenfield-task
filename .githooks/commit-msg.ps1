param(
    [Parameter(Mandatory = $true)]
    [string] $CommitMessagePath
)

$ErrorActionPreference = "Stop"

$repoRoot = git rev-parse --show-toplevel
Set-Location $repoRoot

$changedFiles = git diff --cached --name-only --diff-filter=ACMR
$requiresTrailer = $false

foreach ($file in $changedFiles) {
    if ($file -match '^(src|tests|evals|openspec|scripts)/') {
        $requiresTrailer = $true
        break
    }
}

if (-not $requiresTrailer) {
    exit 0
}

$message = Get-Content -Raw -Path $CommitMessagePath
$hasRefs = $message -match '(?m)^Refs:\s*(FR|NFR|TC|BC)-[A-Z]+-\d{2}\b'
$hasSlice = $message -match '(?m)^Slice:\s*[a-z0-9][a-z0-9-]*\b'

if (-not ($hasRefs -or $hasSlice)) {
    Write-Error "Commits touching src/tests/evals/openspec/scripts require a trailer: 'Refs: FR-...' or 'Slice: <name>'."
    exit 1
}
