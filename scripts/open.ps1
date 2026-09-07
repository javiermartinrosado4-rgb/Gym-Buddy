$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectPath
$listener = Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) {
    $serverProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
    if ($serverProcess.Name -eq 'node.exe' -and $serverProcess.CommandLine.Contains($projectPath) -and $serverProcess.CommandLine.Contains('expo')) {
        Write-Host 'Gym Buddy ya esta en marcha. Abriendo el navegador.'
        Start-Process 'http://localhost:8081'
        exit 0
    }
    Write-Host 'Otra aplicacion esta utilizando el puerto 8081. Cierrala antes de abrir Gym Buddy.'
    exit 1
}
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'User') + ';' + $env:Path
Write-Host 'Abriendo Gym Buddy. Deja esta ventana abierta mientras utilizas la aplicacion.'
Write-Host 'Para detenerla, pulsa Ctrl+C o utiliza Detener Gym60.cmd.'
& npx.cmd expo start --web --localhost --port 8081
