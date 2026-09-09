param(
    [ValidateSet('apk', 'aab', 'both')] [string]$Format = 'apk',
    [string]$CommunityUrl = '',
    [switch]$LocalTest,
    [switch]$SkipPrebuild
)
$ErrorActionPreference = 'Stop'
if ($LocalTest -and $Format -ne 'apk') { throw 'La variante HTTP local solo genera APK de prueba.' }
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$toolPath = Join-Path $env:USERPROFILE '.local\gym-buddy-android'
if (-not $env:JAVA_HOME) {
    $jdk = Get-ChildItem -LiteralPath (Join-Path $toolPath 'java') -Directory | Select-Object -First 1
    if (-not $jdk) { throw 'Instala JDK 17 y configura JAVA_HOME.' }
    $env:JAVA_HOME = $jdk.FullName
}
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' }
if (-not (Test-Path -LiteralPath (Join-Path $env:ANDROID_HOME 'platform-tools\adb.exe'))) { throw 'Instala Android SDK (API 36, Build Tools 36) y configura ANDROID_HOME.' }
if ($CommunityUrl) { $env:EXPO_PUBLIC_COMMUNITY_URL = $CommunityUrl }
if ($env:EXPO_PUBLIC_COMMUNITY_URL) {
    $uri = [uri]$env:EXPO_PUBLIC_COMMUNITY_URL
    if (-not $uri.IsAbsoluteUri -or $uri.UserInfo -or $uri.Query -or $uri.Fragment -or ($uri.Scheme -ne 'https' -and -not ($LocalTest -and $uri.Scheme -eq 'http'))) { throw 'Comunidad necesita una URL HTTPS sin credenciales ni parametros; HTTP solo se admite con -LocalTest.' }
}
$env:GYM_ANDROID_LOCAL = if ($LocalTest) { '1' } else { '0' }
$env:GYM_ANDROID_SIGNING_FILE = Join-Path $toolPath 'signing\signing.properties'
$env:NODE_ENV = 'production'
Push-Location $projectPath
try {
    node scripts/android-signing.mjs (Join-Path $toolPath 'signing')
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar la firma Android.' }
    if (-not $SkipPrebuild) {
        npx.cmd expo prebuild --platform android --no-install
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el proyecto Android.' }
    }
    $manifest = Get-Content -Raw -LiteralPath 'android\app\src\main\AndroidManifest.xml'
    $expectedCleartext = if ($LocalTest) { 'true' } else { 'false' }
    if ($manifest -notmatch ('android:usesCleartextTraffic="' + $expectedCleartext + '"')) { throw 'La configuracion nativa no coincide con la variante solicitada. Repite sin -SkipPrebuild.' }
    $tasks = switch ($Format) { 'apk' { @(':app:assembleRelease') }; 'aab' { @(':app:bundleRelease') }; 'both' { @(':app:assembleRelease', ':app:bundleRelease') } }
    Push-Location android
    try {
        & .\gradlew.bat @tasks --no-daemon --console=plain --max-workers=4 '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m' '-PreactNativeArchitectures=arm64-v8a,x86_64'
        if ($LASTEXITCODE -ne 0) { throw 'La compilación Android ha fallado.' }
    } finally { Pop-Location }
    $outputPath = Join-Path $projectPath 'artifacts\android'
    New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
    $suffix = if ($LocalTest) { 'local-test' } else { 'preview' }
    if ($Format -ne 'aab') { Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination (Join-Path $outputPath "gym-buddy-$suffix.apk") }
    if ($Format -ne 'apk') { Copy-Item -LiteralPath 'android\app\build\outputs\bundle\release\app-release.aab' -Destination (Join-Path $outputPath 'gym-buddy-release.aab') }
    Get-ChildItem -LiteralPath $outputPath | Where-Object Extension -In '.apk','.aab' | Get-FileHash -Algorithm SHA256
} finally { Pop-Location }
