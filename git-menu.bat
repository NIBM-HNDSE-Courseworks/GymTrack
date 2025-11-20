@echo off
setlocal enabledelayedexpansion

:: === SET YOUR PROJECT FOLDER HERE ===
set "PROJECT=C:\Project"
set "REPO=https://github.com/NIBM-HNDSE-Courseworks/GymTrack.git"

cd "%PROJECT%"

echo ============================================
echo   GIT MENU
echo ============================================
echo 1. Pull from GitHub
echo 2. Push to GitHub
echo ============================================
set /p choice=Enter your choice (1 or 2): 

if "%choice%"=="1" goto doPull
if "%choice%"=="2" goto doPush

echo Wrong choice.
pause
exit /b

:doPull
echo Pulling latest changes...
git fetch
git pull origin main
if %errorlevel% neq 0 (
    echo Merge conflict detected!
    git status
    echo Fix conflicts, then run:
    echo git add . && git commit -m "fix"
)
pause
exit /b

:doPush
echo Staging all files except git-menu.bat, Commit.bat, and node_modules...
:: Stage all modified/untracked files EXCEPT skipped ones
for /f "delims=" %%f in ('git ls-files --others --modified --exclude-standard') do (
    if /i not "%%f"=="git-menu.bat" if /i not "%%f"=="Commit.bat" (
        git add "%%f"
    )
)

:: Show staged files
echo ============================================
echo Files changed and staged for commit:
echo ============================================
git status -s

:: Ask for confirmation to commit new changes
set /p confirm=Do you want to commit these changes? (y/n): 
if /i "%confirm%"=="y" (
    set /p msg=Enter commit message: 
    git commit -m "%msg%"
    if %errorlevel% neq 0 (
        echo Commit failed. Maybe no new changes.
    ) else (
        echo Commit successful!
    )
) else (
    echo Skipping commit.
)

:: Push all commits, including previous ones
echo Pushing all commits to GitHub...
git push origin main
if %errorlevel% neq 0 (
    echo Push failed. You may need to pull first or resolve conflicts.
) else (
    echo Push successful!
)

pause
exit /b
