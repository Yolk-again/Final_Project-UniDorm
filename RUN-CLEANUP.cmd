@echo off
setlocal
cd /d "%~dp0"
echo UniDorm nested-folder cleanup
echo This launches PowerShell with a process-only execution-policy bypass.
echo It does not change your Windows or user execution policy.
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0CLEAN-NESTED-FOLDER.ps1"
set "CLEANUP_EXIT=%ERRORLEVEL%"
echo.
if not "%CLEANUP_EXIT%"=="0" (
  echo Cleanup failed. The nested folder should remain untouched if backup failed.
) else (
  echo Cleanup command finished. Run the verification commands in PROJECT-FOLDER-CLEANUP.md.
)
echo.
pause
exit /b %CLEANUP_EXIT%
