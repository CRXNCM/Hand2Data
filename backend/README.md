# Hand2File Backend API

A FastAPI-based backend service that provides OCR (Optical Character Recognition) capabilities using both Tesseract and TrOCR models. This backend integrates your existing Python OCR applications into a web API.

## Features

- **Dual OCR Support**: Both Tesseract OCR and TrOCR (Microsoft's Transformer-based OCR)
- **Image Preprocessing**: Advanced image preprocessing with configurable parameters
- **GPU Acceleration**: Automatic GPU detection and utilization for TrOCR
- **File Upload**: Secure file upload with validation
- **RESTful API**: Clean REST API endpoints for easy frontend integration
- **CORS Support**: Configured for frontend integration

## Project Structure

```
backend/
├─ app/                        # Main backend application
│   ├─ __init__.py
│   ├─ main.py                 # FastAPI app entrypoint
│   │
│   ├─ routes/                 # API route definitions
│   │   ├─ __init__.py
│   │   └─ ocr_routes.py       # Routes for OCR processing
│   │
│   ├─ services/               # Business logic / integration with OCR
│   │   ├─ __init__.py
│   │   ├─ tesseract_service.py # Calls your pytesseract OCR
│   │   └─ trocr_service.py     # Calls TrOCR (transformers + torch)
│   │
│   └─ utils/                  # Any helpers, e.g., file validation
│       ├─ __init__.py
│       └─ file_utils.py
│
├─ python_ocr/                 # Your existing Python OCR program
│   ├─ Basic_OCR_App.py
│   ├─ ocr_preprocess.py
│   ├─ preprocess_ocr.py
│   ├─ download_model.py
│   └─ check_gpu.py
│
├─ requirements.txt            # Python dependencies
├─ README.md
└─ uploads/                    # Directory for uploaded files (auto-created)
```

## Prerequisites

### System Requirements

1. **Python 3.8+**
2. **Tesseract OCR** (for Tesseract service)
   - Windows: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki)
   - Linux: `sudo apt-get install tesseract-ocr`
   - macOS: `brew install tesseract`

3. **CUDA (Optional)** - For GPU acceleration with TrOCR
   - Install CUDA toolkit if you have an NVIDIA GPU
   - PyTorch will automatically detect and use CUDA if available

## Installation

1. **Clone or navigate to the backend directory**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended)**
   ```bash
   python -m venv venv
   
   # Windows
   venv\Scripts\activate
   
   # Linux/macOS
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Verify Tesseract installation**
   ```bash
   python -c "import pytesseract; print(pytesseract.get_tesseract_version())"
   ```

## Running the Backend

### Development Mode
```bash
python -m app.main
```

Or using uvicorn directly:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Mode
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at: `http://localhost:8000`

## API Documentation

Once the server is running, you can access:
- **Interactive API docs**: `http://localhost:8000/docs`
- **ReDoc documentation**: `http://localhost:8000/redoc`

## API Endpoints

### 1. Extract Text from Image
**POST** `/api/ocr/extract-text`

Extract text from an uploaded image using either Tesseract or TrOCR.

**Parameters:**
- `file`: Image file (multipart/form-data)
- `ocr_type`: "tesseract" or "trocr" (default: "trocr")
- `use_preprocessing`: boolean (default: true)
- `blur_kernel`: int (default: 5)
- `threshold_method`: string (default: "Adaptive Gaussian")
- `block_size`: int (default: 11)
- `c_value`: int (default: 2)

**Response:**
```json
{
  "success": true,
  "text": "Extracted text here",
  "confidence": 0.95,
  "processing_time": 1.23,
  "file_path": "uploads/filename.png",
  "ocr_type": "trocr",
  "preprocessing_used": true
}
```

### 2. Preprocess Image
**POST** `/api/ocr/preprocess`

Preprocess an image and return the processed version.

**Parameters:**
- `file`: Image file (multipart/form-data)
- `blur_kernel`: int (default: 5)
- `threshold_method`: string (default: "Adaptive Gaussian")
- `block_size`: int (default: 11)
- `c_value`: int (default: 2)
- `simple_thresh_value`: int (default: 127)

**Response:**
```json
{
  "success": true,
  "processed_image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "settings": {
    "blur_kernel": 5,
    "threshold_method": "Adaptive Gaussian",
    "block_size": 11,
    "c_value": 2,
    "simple_thresh_value": 127
  }
}
```

### 3. Get Model Status
**GET** `/api/ocr/models/status`

Get the status of OCR models.

**Response:**
```json
{
  "tesseract": {
    "loaded": true,
    "status": "Ready",
    "type": "Tesseract OCR",
    "version": "5.3.0"
  },
  "trocr": {
    "loaded": true,
    "status": "Ready - Using CUDA - NVIDIA GeForce RTX 3080 (10.00 GB)",
    "type": "TrOCR Large Handwritten",
    "device": "cuda",
    "model": "microsoft/trocr-large-handwritten"
  }
}
```

### 4. Download Models
**POST** `/api/ocr/models/download`

Download TrOCR models (if not already cached).

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Server configuration
HOST=0.0.0.0
PORT=8000
DEBUG=True

# File upload settings
MAX_FILE_SIZE=10485760  # 10MB in bytes
UPLOAD_DIR=uploads

# CORS settings
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Tesseract path (Windows only)
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

### CORS Configuration

Update the CORS origins in `app/main.py` to include your frontend URLs:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Integration with Frontend

### Example Frontend Integration

```javascript
// Upload and process image
const formData = new FormData();
formData.append('file', imageFile);
formData.append('ocr_type', 'trocr');
formData.append('use_preprocessing', 'true');

const response = await fetch('http://localhost:8000/api/ocr/extract-text', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Extracted text:', result.text);
```

## Troubleshooting

### Common Issues

1. **Tesseract not found**
   - Ensure Tesseract is installed and in PATH
   - On Windows, update the path in `tesseract_service.py`

2. **CUDA out of memory**
   - Reduce batch size or use CPU mode
   - Close other GPU-intensive applications

3. **Model download fails**
   - Check internet connection
   - Ensure sufficient disk space (TrOCR model is ~1.5GB)

4. **File upload errors**
   - Check file size limits
   - Ensure file is a valid image format

### Performance Tips

1. **GPU Acceleration**: Ensure CUDA is properly installed for TrOCR
2. **Model Caching**: Models are cached after first download
3. **File Cleanup**: Old uploaded files are automatically cleaned up
4. **Preprocessing**: Use preprocessing for better OCR accuracy

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black app/
flake8 app/
```

### Adding New OCR Models

1. Create a new service in `app/services/`
2. Add routes in `app/routes/ocr_routes.py`
3. Update the main router in `app/main.py`

## License

This project integrates your existing Python OCR applications into a web API. Please ensure you comply with the licenses of the underlying OCR libraries (Tesseract, TrOCR, etc.).

## Support

For issues related to:
- **Tesseract**: Check [Tesseract documentation](https://tesseract-ocr.github.io/)
- **TrOCR**: Check [Hugging Face TrOCR page](https://huggingface.co/microsoft/trocr-large-handwritten)
- **FastAPI**: Check [FastAPI documentation](https://fastapi.tiangolo.com/)
