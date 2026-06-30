@echo off
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
python -m pip install -r requirements-ocr.txt

rem Use ASCII-only tessdata path (avoids OneDrive/Arabic Desktop path issues)
set "TESS_RUNTIME=%LOCALAPPDATA%\telecom-platform\tessdata"
if not exist "%TESS_RUNTIME%" mkdir "%TESS_RUNTIME%"
if exist "tessdata\*.traineddata" copy /Y "tessdata\*.traineddata" "%TESS_RUNTIME%\" >nul 2>&1
if exist "C:\Program Files\Tesseract-OCR\tessdata\eng.traineddata" (
  if not exist "%TESS_RUNTIME%\eng.traineddata" copy /Y "C:\Program Files\Tesseract-OCR\tessdata\eng.traineddata" "%TESS_RUNTIME%\" >nul 2>&1
)
set "TESSDATA_PREFIX=%TESS_RUNTIME%"
set "TESSDATA_DIR=%TESS_RUNTIME%"

python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
