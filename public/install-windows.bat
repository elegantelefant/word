@echo off
REM Elefant Word Add-in Installer for Windows
REM Downloads the manifest to Word's sideload folder.

set MANIFEST_URL=https://elefant-word-245916757771.us-central1.run.app/manifest.xml
set WEF_DIR=%LOCALAPPDATA%\Microsoft\Office\16.0\Wef

echo Installing Elefant Word Add-in...
echo.

if not exist "%WEF_DIR%" mkdir "%WEF_DIR%"

powershell -Command "Invoke-WebRequest -Uri '%MANIFEST_URL%' -OutFile '%WEF_DIR%\manifest.xml'"

if %ERRORLEVEL% equ 0 (
    echo Done! Restart Word, then click Home ^> Open Elefant.
) else (
    echo Download failed. Check your internet connection and try again.
    exit /b 1
)
