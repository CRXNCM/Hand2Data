from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import base64
import io
import os
from PIL import Image
import cv2
import numpy as np
from typing import Optional

from app.services.tesseract_service import TesseractService
from app.services.trocr_service import TrOCRService
from app.utils.file_utils import validate_image_file, save_uploaded_file

router = APIRouter()

# Initialize services
tesseract_service = TesseractService()
trocr_service = TrOCRService()

@router.post("/extract-text")
async def extract_text(
    file: UploadFile = File(...),
    ocr_type: str = Form("tesseract"),  # "tesseract" or "trocr"
    model_type: str = Form("large-handwritten"),  # TrOCR model type
    use_preprocessing: bool = Form(True),
    blur_kernel: int = Form(5),
    threshold_method: str = Form("Adaptive Gaussian"),
    block_size: int = Form(11),
    c_value: int = Form(2),
    primary_language: str = Form("eng"),
    language_detection: bool = Form(True),
    custom_dictionary: str = Form(""),
    processing_speed: str = Form("balanced"),
    accuracy_level: str = Form("high")
):
    """
    Extract text from uploaded image using specified OCR method
    """
    try:
        # Validate file
        if not validate_image_file(file):
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Read image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Convert PIL to OpenCV format
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Save uploaded file for reference
        file_path = await save_uploaded_file(file, image_data)
        
        # Process with selected OCR service
        if ocr_type == "tesseract":
            result = await tesseract_service.extract_text(
                image_cv, 
                use_preprocessing=use_preprocessing,
                blur_kernel=blur_kernel,
                threshold_method=threshold_method,
                block_size=block_size,
                c_value=c_value,
                processing_speed=processing_speed,
                accuracy_level=accuracy_level
            )
        elif ocr_type == "trocr":
            # Check if the requested model is loaded, if not load it
            if not trocr_service.model_loaded or trocr_service.current_model_type != model_type:
                # Try to load the requested model
                load_result = await trocr_service.download_model(model_type)
                if not load_result["success"]:
                    # Fallback to Tesseract if TrOCR fails
                    print(f"TrOCR model {model_type} failed to load: {load_result['message']}")
                    print("Falling back to Tesseract OCR...")
                    
                    # Use Tesseract as fallback
                    result = await tesseract_service.extract_text(
                        image_cv, 
                        use_preprocessing=use_preprocessing,
                        blur_kernel=blur_kernel,
                        threshold_method=threshold_method,
                        block_size=block_size,
                        c_value=c_value,
                        processing_speed=processing_speed,
                        accuracy_level=accuracy_level
                    )
                    # Add fallback info to result
                    result["fallback_used"] = True
                    result["fallback_reason"] = f"TrOCR model {model_type} failed to load: {load_result['message']}"
                else:
                    # TrOCR loaded successfully, use it
                    result = await trocr_service.extract_text(
                        image_cv,
                        use_preprocessing=use_preprocessing,
                        blur_kernel=blur_kernel,
                        threshold_method=threshold_method,
                        block_size=block_size,
                        c_value=c_value,
                        processing_speed=processing_speed,
                        accuracy_level=accuracy_level
                    )
            else:
                # Model already loaded, use it
                result = await trocr_service.extract_text(
                    image_cv,
                    use_preprocessing=use_preprocessing,
                    blur_kernel=blur_kernel,
                    threshold_method=threshold_method,
                    block_size=block_size,
                    c_value=c_value,
                    processing_speed=processing_speed,
                    accuracy_level=accuracy_level
                )
        else:
            raise HTTPException(status_code=400, detail="Invalid OCR type. Use 'tesseract' or 'trocr'")
        
        return JSONResponse(content={
            "success": True,
            "text": result["text"],
            "confidence": result.get("confidence", 0.95),
            "processing_time": result.get("processing_time", 0),
            "file_path": file_path,
            "ocr_type": ocr_type,
            "model_type": model_type if ocr_type == "trocr" else None,
            "preprocessing_used": use_preprocessing,
            "settings_used": {
                "primary_language": primary_language,
                "language_detection": language_detection,
                "custom_dictionary": custom_dictionary,
                "processing_speed": processing_speed,
                "accuracy_level": accuracy_level,
                "blur_kernel": blur_kernel,
                "threshold_method": threshold_method,
                "block_size": block_size,
                "c_value": c_value
            }
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

@router.post("/preprocess")
async def preprocess_image(
    file: UploadFile = File(...),
    blur_kernel: int = Form(5),
    threshold_method: str = Form("Adaptive Gaussian"),
    block_size: int = Form(11),
    c_value: int = Form(2),
    simple_thresh_value: int = Form(127)
):
    """
    Preprocess image and return processed image
    """
    try:
        print(f"Received parameters: blur_kernel={blur_kernel}, threshold_method={threshold_method}, block_size={block_size}, c_value={c_value}, simple_thresh_value={simple_thresh_value}")
        print(f"File: {file.filename}, Content-Type: {file.content_type}, Size: {file.size}")
        # Validate file
        if not validate_image_file(file):
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Read image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        # Preprocess image
        processed_image = tesseract_service.preprocess_image(
            image_cv,
            blur_kernel=blur_kernel,
            threshold_method=threshold_method,
            block_size=block_size,
            c_value=c_value,
            simple_thresh_value=simple_thresh_value
        )
        
        # Convert processed image back to base64
        _, buffer = cv2.imencode('.png', processed_image)
        processed_base64 = base64.b64encode(buffer).decode()
        
        return JSONResponse(content={
            "success": True,
            "processed_image": f"data:image/png;base64,{processed_base64}",
            "settings": {
                "blur_kernel": blur_kernel,
                "threshold_method": threshold_method,
                "block_size": block_size,
                "c_value": c_value,
                "simple_thresh_value": simple_thresh_value
            }
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image preprocessing failed: {str(e)}")

@router.get("/models/status")
async def get_models_status():
    """
    Get status of OCR models
    """
    try:
        tesseract_status = tesseract_service.get_status()
        trocr_status = trocr_service.get_status()
        
        return JSONResponse(content={
            "tesseract": tesseract_status,
            "trocr": trocr_status
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get model status: {str(e)}")

@router.get("/models/available")
async def get_available_models():
    """
    Get list of available TrOCR models
    """
    try:
        available_models = trocr_service.get_available_models()
        installed_models = trocr_service.get_installed_models()
        
        return JSONResponse(content={
            "available_models": available_models,
            "installed_models": installed_models
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get available models: {str(e)}")

@router.post("/models/download")
async def download_models(model_type: str = "large-handwritten"):
    """
    Download required models (TrOCR) using the standalone download script
    """
    try:
        result = await trocr_service.download_model(model_type)
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model download failed: {str(e)}")

@router.post("/models/force-download")
async def force_download_models(model_type: str = "large-handwritten"):
    """
    Force download models even if they exist locally
    """
    try:
        # Reset the service state to force re-download
        trocr_service.model_loaded = False
        trocr_service.status = f"Force downloading TrOCR {model_type} model..."
        
        result = await trocr_service.download_model(model_type)
        return JSONResponse(content=result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Force model download failed: {str(e)}")

@router.delete("/models/cache")
async def clear_model_cache():
    """
    Clear local model cache
    """
    try:
        import shutil
        model_dir = trocr_service._get_model_path()
        
        if os.path.exists(model_dir):
            shutil.rmtree(model_dir)
            trocr_service.model_loaded = False
            trocr_service.status = "Local cache cleared"
            
            return JSONResponse(content={
                "success": True,
                "message": "Model cache cleared successfully",
                "status": trocr_service.status
            })
        else:
            return JSONResponse(content={
                "success": True,
                "message": "No local cache found",
                "status": "No cache to clear"
            })
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear model cache: {str(e)}")
