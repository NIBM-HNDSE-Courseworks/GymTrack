@echo off
setlocal enabledelayedexpansion

:: Show modified or new files
echo ============================================
echo Files changed and ready to commit:
echo ============================================
git status -s

:: Ask user for confirmation
set /p confirm=Do you want to commit these changes??? (y/n): 
if /i not "%confirm%"=="y" (
    echo Commit canceled.
    pause
    exit /b
)

:: Ask for commit message
set /p msg=Enter commit message: 

:: Commit staged changes
git commit -m "%msg%"

if %errorlevel% neq 0 (
    echo Commit failed. Maybe no changes to commit.
) else (
    echo Commit successful!
)

pause
exit /b
