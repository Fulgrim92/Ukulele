param([string]$LyricsFolder = '')
$ErrorActionPreference = 'Stop'
$projectFolder = Split-Path -Parent $PSScriptRoot
Push-Location $projectFolder
try {
    if (-not $env:JAVA_HOME -and (Test-Path 'H:\AI_Code\android-build\jdk-21.0.12.1+1')) {
        $env:JAVA_HOME = 'H:\AI_Code\android-build\jdk-21.0.12.1+1'
    }
    if (-not $env:ANDROID_HOME -and (Test-Path 'H:\AI_Code\android-build\sdk')) {
        $env:ANDROID_HOME = 'H:\AI_Code\android-build\sdk'
    }
    if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\javac.exe")) {
        throw 'Set JAVA_HOME to an installed JDK 21 folder first.'
    }
    if (-not $env:ANDROID_HOME -or -not (Test-Path "$env:ANDROID_HOME\platforms\android-36\android.jar")) {
        throw 'Set ANDROID_HOME to an Android SDK containing platform 36 and build-tools 36.'
    }
    $env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
    if ($LyricsFolder) { & node scripts/prepare-android.mjs --lyrics $LyricsFolder }
    else { & node scripts/prepare-android.mjs }
    if ($LASTEXITCODE -ne 0) { throw 'Could not prepare Android assets.' }
    & npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Could not sync the Android project.' }
    New-Item -ItemType Directory -Force '.android-secrets' | Out-Null
    $signingFile = Join-Path $projectFolder '.android-secrets\four-strings-debug.keystore'
    if (-not (Test-Path -LiteralPath $signingFile)) {
        & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $signingFile -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Four Strings Personal Build'
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the local test signing key.' }
    }
    Push-Location android
    try {
        & .\gradlew.bat assembleDebug --console=plain
        if ($LASTEXITCODE -ne 0) { throw 'The Android build failed.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Force 'apk-output' | Out-Null
    Copy-Item -LiteralPath 'android\app\build\outputs\apk\debug\app-debug.apk' -Destination 'apk-output\Four-Strings.apk' -Force
    Write-Host "APK ready: $projectFolder\apk-output\Four-Strings.apk"
} finally { Pop-Location }
