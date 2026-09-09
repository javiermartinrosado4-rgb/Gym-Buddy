$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$apiPort = if ($env:GYM_API_PORT) { [int]$env:GYM_API_PORT } else { 8082 }
$listeners = @(Get-NetTCPConnection -LocalPort 8081,$apiPort -State Listen -ErrorAction SilentlyContinue)
$stopped = $false
foreach ($listener in $listeners) {
    $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if ($serverProcess -and $serverProcess.Name -eq 'node.exe' -and $serverProcess.CommandLine.Contains($projectPath) -and ($serverProcess.CommandLine.Contains('expo') -or $serverProcess.CommandLine.Contains('server'))) {
        Stop-Process -Id $serverProcess.ProcessId
        $stopped = $true
    }
}
if ($stopped) { Write-Host 'Akhyles se ha detenido. Entrenamientos, cuentas y fotos guardadas se conservan.' }
else { Write-Host 'Akhyles no esta en marcha. No se ha detenido ninguna otra aplicacion.' }
