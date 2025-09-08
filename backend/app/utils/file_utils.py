import os
import uuid
from pathlib import Path
from fastapi import UploadFile
from typing import List

# Try to import magic, fallback to mimetypes if not available
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    import mimetypes

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/bmp',
    'image/tiff',
    'image/tif',
    'image/webp'
}

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.webp'
}

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

def validate_image_file(file: UploadFile) -> bool:
    """
    Validate uploaded image file
    """
    try:
        # Check file size
        if file.size and file.size > MAX_FILE_SIZE:
            return False
        
        # Check file extension
        if file.filename:
            file_ext = Path(file.filename).suffix.lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                return False
        
        # Check MIME type
        if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
            return False
        
        return True
        
    except Exception:
        return False

def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return Path(filename).suffix.lower()

def generate_unique_filename(original_filename: str) -> str:
    """Generate unique filename while preserving extension"""
    file_ext = get_file_extension(original_filename)
    unique_id = str(uuid.uuid4())
    return f"{unique_id}{file_ext}"

async def save_uploaded_file(file: UploadFile, file_data: bytes) -> str:
    """
    Save uploaded file to uploads directory
    Returns the file path
    """
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads")
    upload_dir.mkdir(exist_ok=True)
    
    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename or "upload")
    file_path = upload_dir / unique_filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        buffer.write(file_data)
    
    return str(file_path)

def cleanup_old_files(max_age_hours: int = 24):
    """
    Clean up old uploaded files
    """
    try:
        upload_dir = Path("uploads")
        if not upload_dir.exists():
            return
        
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for file_path in upload_dir.iterdir():
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    file_path.unlink()
                    
    except Exception as e:
        print(f"Error cleaning up old files: {e}")

def get_file_info(file_path: str) -> dict:
    """
    Get file information
    """
    try:
        path = Path(file_path)
        if not path.exists():
            return {}
        
        stat = path.stat()
        return {
            "filename": path.name,
            "size": stat.st_size,
            "created": stat.st_ctime,
            "modified": stat.st_mtime,
            "extension": path.suffix.lower()
        }
    except Exception:
        return {}

def is_image_file(file_path: str) -> bool:
    """
    Check if file is an image using file magic or mimetypes
    """
    try:
        if MAGIC_AVAILABLE:
            mime_type = magic.from_file(file_path, mime=True)
            return mime_type in ALLOWED_IMAGE_TYPES
        else:
            # Fallback to mimetypes module
            mime_type, _ = mimetypes.guess_type(file_path)
            return mime_type in ALLOWED_IMAGE_TYPES
    except Exception:
        # Final fallback to extension check
        return get_file_extension(file_path) in ALLOWED_EXTENSIONS
