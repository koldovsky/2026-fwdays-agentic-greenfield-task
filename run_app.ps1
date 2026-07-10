$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$logsDir = Join-Path $PSScriptRoot 'logs'
$logFile = Join-Path $logsDir 'app.log'
$backoffSeconds = 5

if (-not (Test-Path $python)) {
    throw ".venv not found at $python. Run install_service.ps1 after creating the virtual environment."
}

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

while ($true) {
    $startedAt = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$startedAt] Starting wsgi.py"
    & $python wsgi.py 2>&1 | Tee-Object -FilePath $logFile -Append
    $exitCode = $LASTEXITCODE
    $stoppedAt = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    Add-Content -Path $logFile -Value "[$stoppedAt] wsgi.py exited with code $exitCode; restarting in $backoffSeconds s"
    Start-Sleep -Seconds $backoffSeconds
    if ($backoffSeconds -lt 60) {
        $backoffSeconds = [Math]::Min($backoffSeconds * 2, 60)
    }
}
