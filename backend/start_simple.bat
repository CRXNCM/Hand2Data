@echo off
echo Starting Hand2File Backend (Simple Mode - No TrOCR Model)
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Start the server
echo Starting server on http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Note: TrOCR model is not loaded. Use Tesseract OCR or download TrOCR later.
echo.

python start.py
