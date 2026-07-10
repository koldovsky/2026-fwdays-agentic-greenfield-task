$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$taskName = 'STPTreeDiffWebApp'
$scriptPath = Join-Path $PSScriptRoot 'run_app.ps1'
$python = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
$logsDir = Join-Path $PSScriptRoot 'logs'

if (-not (Test-Path $python)) {
    throw ".venv not found at $python. Create it first: python -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt"
}

if (-not (Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`""
$triggerLogon = New-ScheduledTaskTrigger -AtLogOn
$triggerBoot = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger @($triggerLogon, $triggerBoot) -Settings $settings -Description 'STP Tree Diff web app'
Write-Host "Installed scheduled task: $taskName"
