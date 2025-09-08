## Hand2Data

End-to-end handwritten OCR toolkit with a FastAPI backend (Tesseract + TrOCR) and a modern React (Vite + Tailwind) frontend. Import an image, optionally preprocess it, and extract text using either classic Tesseract or transformer-based TrOCR with optional GPU acceleration.

### Highlights
- **Dual OCR engines**: Tesseract and Microsoft TrOCR (transformers/torch)
- **Preprocessing pipeline**: Blur, thresholding, tunable parameters
- **GPU-aware**: Detects CUDA for TrOCR when available
- **Modern UI**: React + Vite + Tailwind, with configurable settings and history
- **Clean API**: FastAPI routes with Swagger docs, CORS configured for local dev

---

## Monorepo Structure
```
Hand2Data/
  backend/                 # FastAPI service and OCR logic
    app/
      main.py              # API entrypoint
      routes/ocr_routes.py # OCR + preprocessing + model mgmt endpoints
      services/            # Tesseract + TrOCR service abstractions
      utils/               # File utilities (validation, saving)
    python_ocr/            # Standalone helper scripts (GPU check, model download)
    requirements.txt       # Backend dependencies
    start.py               # Convenient dev server starter (uvicorn)

  frontend/                # React (Vite) single-page app
    src/                   # Pages, components, contexts, services
    package.json           # Frontend scripts and deps

  preprocess_ocr/          # Duplicate/variant preprocessing scripts (reference)
```

---

## Quickstart

### Prerequisites
- Python 3.9+ (3.10 recommended)
- Node.js 18+ and npm
- Tesseract OCR installed (required if using Tesseract):
  - Windows: UB Mannheim build (search for "Tesseract Windows UB Mannheim")
  - macOS: `brew install tesseract`
  - Linux: `sudo apt-get install tesseract-ocr`
- Optional: NVIDIA GPU with CUDA for TrOCR acceleration

### 1) Backend (FastAPI)
From the repository root:
```bash
cd backend

# Create and activate venv (Windows PowerShell)
python -m venv venv
venv\Scripts\activate

# macOS/Linux
# python -m venv venv
# source venv/bin/activate

pip install -r requirements.txt

# Run the API (hot reload enabled by default in start.py)
python start.py
```
API docs: `http://localhost:8000/docs`  |  ReDoc: `http://localhost:8000/redoc`

Tesseract on Windows: if not on PATH, configure the absolute path inside `tesseract_service.py` or via env var `TESSERACT_CMD`.

### 2) Frontend (React + Vite)
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Vite dev server: `http://localhost:5173`

The backend already allows CORS for `http://localhost:5173`.

---

## How it works

- The frontend lets you upload an image, tune preprocessing, and choose OCR engine.
- The backend receives the image, optionally pre-processes it (OpenCV), then runs:
  - Tesseract via `pytesseract`, or
  - TrOCR via Hugging Face transformers + PyTorch (uses CUDA if available).
- TrOCR models are cached locally after the first download and reused across runs.

---

## API Overview
Base URL: `http://localhost:8000`

- Health
  - `GET /` → `{ message }`
  - `GET /health` → `{ status: "healthy" }`

- OCR
  - `POST /api/ocr/extract-text`
    - multipart/form-data: `file` (image), form fields:
      - `ocr_type`: `tesseract` | `trocr` (default `tesseract`)
      - `model_type`: TrOCR variant (default `large-handwritten`)
      - `use_preprocessing` (bool, default true)
      - `blur_kernel` (int, default 5)
      - `threshold_method` (string, e.g. "Adaptive Gaussian")
      - `block_size` (int, default 11)
      - `c_value` (int, default 2)
      - Optional UX fields forwarded in `settings_used`: `primary_language`, `language_detection`, `custom_dictionary`, `processing_speed`, `accuracy_level`
    - Response: `{ success, text, confidence?, processing_time?, file_path, ocr_type, model_type?, preprocessing_used, settings_used }`

  - `POST /api/ocr/preprocess`
    - multipart/form-data: `file` (image), with knobs:
      - `blur_kernel`, `threshold_method`, `block_size`, `c_value`, `simple_thresh_value`
    - Response: `{ success, processed_image: "data:image/png;base64,...", settings }`

- Models (TrOCR)
  - `GET /api/ocr/models/status` → status for Tesseract + TrOCR
  - `GET /api/ocr/models/available` → available + installed TrOCR models
  - `POST /api/ocr/models/download` (form: `model_type`) → downloads if missing
  - `POST /api/ocr/models/force-download` (form: `model_type`) → re-downloads
  - `DELETE /api/ocr/models/cache` → clears local model cache

Tip: Explore and test all endpoints in Swagger UI at `http://localhost:8000/docs`.

---

## Configuration

Create `backend/.env` (optional). Common variables:
```env
# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# File uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGINS=http://localhost:5173

# Windows-only: Tesseract path if not on PATH
TESSERACT_CMD=C:\\Program Files\\Tesseract-OCR\\tesseract.exe
```

Note: CORS defaults are also coded in `backend/app/main.py`.

---

## Scripts you might find useful

- Backend
  - `backend/start.py`: starts Uvicorn with helpful logging
  - `backend/test_backend.py`: sample/tests for backend
  - `backend/test_preprocessing.py`: quick preprocessing test
  - `backend/python_ocr/download_model.py`: download TrOCR model(s)
  - `backend/python_ocr/check_gpu.py`: quick CUDA availability check
  - Windows helpers: `backend/run.bat`, `backend/start_simple.bat`, `backend/test_curl.bat`

- Frontend
  - `npm run dev` → Vite dev server
  - `npm run build` → production build
  - `npm run preview` → preview production build

---

## Troubleshooting

- Tesseract not found (Windows)
  - Install Tesseract and either add it to PATH or set `TESSERACT_CMD`.

- TrOCR too slow or OOM
  - Ensure CUDA is installed and GPU has enough memory; otherwise use CPU or a smaller model.

- CORS errors in browser
  - Ensure frontend uses `http://localhost:5173` and backend allows it in `app/main.py`.

- Model download fails
  - Check internet connectivity and free disk space (TrOCR can be ~1.5GB).

---

## Development tips

- Use the Swagger UI to iterate quickly on request bodies and parameters.
- Keep uploaded test images small when experimenting (>10MB uploads may be rejected).
- For Windows PowerShell users, prefer running scripts exactly as shown in this README to avoid shell quirks.

---

## License

This repository integrates open-source libraries (Tesseract, PyTorch, Transformers). Ensure compliance with their respective licenses.


