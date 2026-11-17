@echo off
REM ABOUTME: Elefant Word Add-in Installer for Windows: saves the production manifest for this user
REM ABOUTME: and registers it under WEF\Developer, the sideload list Word reloads at every start.

set MANIFEST_URL=https://addin.elefant.legal/manifest.xml
set ADDIN_ID=b8799917-4c67-4488-a596-dd911959e1e7
set INSTALL_DIR=%LOCALAPPDATA%\Elefant
set MANIFEST_PATH=%INSTALL_DIR%\manifest.xml

echo Installing Elefant Word Add-in...
echo.

if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

powershell -NoProfile -Command "Invoke-WebRequest -UseBasicParsing -Uri '%MANIFEST_URL%' -OutFile '%MANIFEST_PATH%'"
if %ERRORLEVEL% neq 0 (
    echo Download failed. Check your internet connection and try again.
    exit /b 1
)

reg add "HKCU\Software\Microsoft\Office\16.0\WEF\Developer" /v "%ADDIN_ID%" /t REG_SZ /d "%MANIFEST_PATH%" /f >nul
if %ERRORLEVEL% neq 0 (
    echo Could not register the add-in with Word.
    exit /b 1
)

echo Done. Close Word completely and open it again, then choose Home ^> Add-ins and select Elefant Legal Assistant.
