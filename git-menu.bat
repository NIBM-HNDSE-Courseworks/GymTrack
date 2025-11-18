@echo off
setlocal enabledelayedexpansion

:: === SET YOUR PROJECT FOLDER HERE ===
set "PROJECT=D:\=------NIBM WORK-----=\HNDSE25.1\IOT\CW\Project"
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
echo Staging all files except git-menu.bat and node_modules...

:: Stage everything except this script and the dashboard's node_modules folder
git add . ":!git-menu.bat" ":!dashboard/node_modules"

echo Enter commit message:
set /p msg=

git commit -m "%msg%"
git push origin main

if %errorlevel% neq 0 (
    echo Push failed. You may need to pull first.
)

pause
exit /b
