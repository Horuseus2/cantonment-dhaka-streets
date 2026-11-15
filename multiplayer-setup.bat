@echo off
echo.
echo  Boys Theft Auto: one time multiplayer server setup
echo  ==================================================
echo.
echo  STEP 1 (in the browser, opens now)
echo    1. Click "Create Database"
echo    2. Location: Singapore (asia-southeast1)
echo    3. Choose "Start in locked mode", then "Enable"
echo.
start "" "https://console.firebase.google.com/project/gaming-boys-futsal/database"
echo  When the database page shows an empty database, come back here.
pause
echo.
echo  STEP 2: uploading the game's security rules...
echo.
cd /d "%~dp0firebase"
call npx --yes firebase-tools@13 deploy --only database --project gaming-boys-futsal
echo.
echo  If it says "Deploy complete", multiplayer is live.
echo  Open the game and click Multiplayer.
echo.
pause
