@echo off
setlocal enabledelayedexpansion

:: === SET YOUR PROJECT FOLDER HERE ===
set "PROJECT=C:\Project"

cd "%PROJECT%"

:: Stage all modified and untracked files except skipped ones
for /f "delims=" %%f in ('git ls-files --others --modified --exclude-standard') do (
    if /i not "%%f"=="git-menu.bat" if /i not "%%f"=="Commit.bat" (
        git add "%%f"
    )
)


:: Show staged files
echo ============================================
echo Files staged and ready to commit:
echo ============================================
git status -s

:: Ask for confirmation
set /p confirm=Do you want to commit these changes? (y/n): 
if /i not "%confirm%"=="y" (
    echo Commit canceled.
    pause
    exit /b
)

:: Ask for commit message
set /p msg=Enter commit message: 

:: Commit changes
git commit -m "%msg%"

if %errorlevel% neq 0 (
    echo Commit failed. Maybe no changes to commit.
) else (
    echo Commit successful!
)

pause
exit /b
