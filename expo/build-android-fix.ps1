# PowerShell Script to Fix and Build Android App
# Run this from the 'expo' directory

$ErrorActionPreference = "Stop"
$DeviceID = "R5CT205V1KV" # Specific device to avoid emulator ghost issues
$PackageName = "com.yerkohenz.receiptsregister"

Write-Host "--- 1. SETTING UP ENVIRONMENT ---" -ForegroundColor Cyan
# Fix: Create local.properties with correct SDK path if missing
$LocalPropsPath = "android\local.properties"
$SdkContent = "sdk.dir=C\:\\Users\\Yerko\\AppData\\Local\\Android\\Sdk"

if (-not (Test-Path $LocalPropsPath)) {
    Write-Host "Creating '$LocalPropsPath'..."
    $SdkContent | Out-File -FilePath $LocalPropsPath -Encoding ASCII
} else {
    Write-Host "'$LocalPropsPath' already exists."
}

Write-Host "`n--- 2. CLEANING UP ---" -ForegroundColor Cyan
# Fix: Uninstall conflicting app to avoid signature mismatch
Write-Host "Uninstalling old app version..."
try {
    adb -s $DeviceID uninstall $PackageName
} catch {
    Write-Host "App not found or uninstall failed (ignoring)..." -ForegroundColor Yellow
}

Write-Host "`n--- 3. BUILDING APK (GRADLE) ---" -ForegroundColor Cyan
# Fix: Use direct Gradle build to bypass Expo CLI device discovery issues
Set-Location android
Get-ChildItem env:JAVA_HOME | Out-Null # Ensure JAVA_HOME is visible if needed
.\gradlew assembleDebug
Set-Location ..

Write-Host "`n--- 4. INSTALLING APK ---" -ForegroundColor Cyan
# Fix: Install manually via ADB to specific device
$ApkPath = "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $ApkPath) {
    Write-Host "Installing APK to $DeviceID..."
    adb -s $DeviceID install -r $ApkPath
} else {
    Write-Error "APK not found at $ApkPath"
}

Write-Host "`n--- 5. SETUP CONNECTIVITY ---" -ForegroundColor Cyan
# Fix: Reverse ports so device can talk to Metro Bundler
Write-Host "Setting up ADB reverse for port 8081..."
adb -s $DeviceID reverse tcp:8081 tcp:8081

Write-Host "`n--- DONE! ---" -ForegroundColor Green
Write-Host "Now run: npx expo start --dev-client"

# TO RUN .\build-android-fix.ps1