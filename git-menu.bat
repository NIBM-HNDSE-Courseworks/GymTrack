@echo off
setlocal enabledelayedexpansion

:: === SET YOUR PROJECT FOLDER HERE ===
set "PROJECT=C:\Users\Gajindu\Desktop\Gajindu\HND\IOT\CW\Gymtrack - Copy"
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
    echo --------------------------------------------
    git status
    echo --------------------------------------------
    echo Fix the conflicts, then run:
    echo git add . && git commit -m "fix"
)
pause
exit /b


:doPush
echo Staging all files except git-menu.bat, Commit.bat, and node_modules...

:: Add all modified and new files except skipped ones
for /f "delims=" %%f in ('git ls-files --others --modified --exclude-standard') do (
    if /i not "%%f"=="git-menu.bat" if /i not "%%f"=="Commit.bat" if /i not "%%f:~0,14"=="dashboard/node_modules" (
        git add "%%f"
    )
)



:: Show modified/staged files for verification
echo ============================================
echo Files changed and staged for commit:
echo ============================================
git status -s

:: Ask user for confirmation
set /p confirm=Do you want to commit these changes? (y/n): 
if /i not "%confirm%"=="y" (
    echo Commit canceled.
    pause
    exit /b
)

:: Enter commit message
set /p msg=Enter commit message: 

:: Commit changes
git commit -m "%msg%"

if %errorlevel% neq 0 (
    echo Commit failed. Maybe no changes to commit.
    pause
    exit /b
)

:: Push changes
git push origin main

if %errorlevel% neq 0 (
    echo Push failed. You may need to pull first.
)

pause
exit /b
