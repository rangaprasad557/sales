@echo off
echo ====================================================================
echo  Apex Inventory & Sales Management System
echo  Multi-Batch Costing, Lowest-Cost Billing & Granular Profit Engine
echo ====================================================================
echo.
echo Initializing database and verifying sample records...
python db.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to run db.py. Please verify Python is installed and in PATH.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Starting Web Server at http://localhost:8000 ...
start "" "http://localhost:8000"
python server.py 8000
pause
