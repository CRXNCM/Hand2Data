@echo off
echo Testing Hand2File Backend Preprocessing...
echo.

REM Check if server is running
echo Checking if server is running...
curl -s http://localhost:8000/health > nul
if %errorlevel% neq 0 (
    echo ❌ Server is not running. Please start it first with: python start.py
    pause
    exit /b 1
)

echo ✅ Server is running!
echo.

REM Test models status
echo Testing models status...
curl -s http://localhost:8000/api/ocr/models/status
echo.
echo.

echo 📋 Available endpoints:
echo   - Health: http://localhost:8000/health
echo   - Models Status: http://localhost:8000/api/ocr/models/status
echo   - API Docs: http://localhost:8000/docs
echo   - Preprocess: http://localhost:8000/api/ocr/preprocess
echo   - Extract Text: http://localhost:8000/api/ocr/extract-text
echo.

echo 🧪 To test preprocessing:
echo   1. Go to http://localhost:8000/docs
echo   2. Find the /api/ocr/preprocess endpoint
echo   3. Click "Try it out"
echo   4. Upload an image file
echo   5. Adjust parameters and click "Execute"
echo.

pause
