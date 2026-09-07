$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$listeners = @(Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)
foreach ($listener in $listeners) {
    $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if ($serverProcess -and $serverProcess.Name -eq 'node.exe' -and $serverProcess.CommandLine.Contains($projectPath) -and $serverProcess.CommandLine.Contains('expo')) {
        Stop-Process -Id $serverProcess.ProcessId
        Write-Host 'Gym60 se ha detenido. Tus datos guardados se conservan.'
        exit 0
    }
}
Write-Host 'Gym60 no esta en marcha en el puerto 8081. No se ha detenido ninguna otra aplicacion.'
