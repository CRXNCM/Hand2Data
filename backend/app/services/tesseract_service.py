import cv2
import numpy as np
import pytesseract
from PIL import Image
import time
import os
from typing import Dict, Any, Optional

class TesseractService:
    def __init__(self):
        self.model_loaded = False
        self.status = "Initializing"
        self._setup_tesseract()
    
    def _setup_tesseract(self):
        """Setup Tesseract OCR"""
        try:
            # For Windows, set the path to Tesseract
            if os.name == 'nt':  # Windows
                tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
                if os.path.exists(tesseract_path):
                    pytesseract.pytesseract.tesseract_cmd = tesseract_path
            
            # Test Tesseract
            pytesseract.get_tesseract_version()
            self.model_loaded = True
            self.status = "Ready"
        except Exception as e:
            self.status = f"Error: {str(e)}"
            self.model_loaded = False
    
    def preprocess_image(self, image: np.ndarray, blur_kernel: int = 5, 
                        threshold_method: str = "Adaptive Gaussian", 
                        block_size: int = 11, c_value: int = 2, 
                        simple_thresh_value: int = 127) -> np.ndarray:
        """
        Preprocess image using the same logic as your Python OCR apps
        """
        # Convert to grayscale
        gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian Blur
        if blur_kernel % 2 == 0:  # Ensure kernel size is odd
            blur_kernel += 1
        blurred_image = cv2.GaussianBlur(gray_image, (blur_kernel, blur_kernel), 0)
        
        # Apply thresholding
        if threshold_method == "Adaptive Gaussian":
            thresh_image = cv2.adaptiveThreshold(
                blurred_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, block_size, c_value
            )
        elif threshold_method == "Adaptive Mean":
            thresh_image = cv2.adaptiveThreshold(
                blurred_image, 255, cv2.ADAPTIVE_THRESH_MEAN_C, 
                cv2.THRESH_BINARY, block_size, c_value
            )
        elif threshold_method == "Otsu":
            _, thresh_image = cv2.threshold(
                blurred_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
            )
        else:  # Simple
            _, thresh_image = cv2.threshold(
                blurred_image, simple_thresh_value, 255, cv2.THRESH_BINARY
            )
        
        return thresh_image
    
    def _get_preprocessing_settings(self, processing_speed: str, accuracy_level: str) -> Dict[str, Any]:
        """Get preprocessing settings based on speed and accuracy preferences"""
        settings = {}
        
        # Processing speed affects preprocessing intensity
        if processing_speed == "fast":
            settings.update({
                'blur_kernel': 3,  # Lighter blur
                'threshold_method': "Simple",  # Faster thresholding
                'block_size': 7,  # Smaller blocks
                'c_value': 1  # Less adjustment
            })
        elif processing_speed == "balanced":
            settings.update({
                'blur_kernel': 5,  # Standard blur
                'threshold_method': "Adaptive Gaussian",  # Balanced thresholding
                'block_size': 11,  # Standard blocks
                'c_value': 2  # Standard adjustment
            })
        elif processing_speed == "high":
            settings.update({
                'blur_kernel': 7,  # More blur
                'threshold_method': "Adaptive Gaussian",  # Better thresholding
                'block_size': 15,  # Larger blocks
                'c_value': 3  # More adjustment
            })
        elif processing_speed == "maximum":
            settings.update({
                'blur_kernel': 9,  # Maximum blur
                'threshold_method': "Otsu",  # Best thresholding
                'block_size': 19,  # Largest blocks
                'c_value': 4  # Maximum adjustment
            })
        
        # Accuracy level affects preprocessing quality
        if accuracy_level == "low":
            # Keep current settings (faster)
            pass
        elif accuracy_level == "medium":
            # Slight improvement
            if processing_speed != "fast":
                settings['threshold_method'] = "Adaptive Gaussian"
        elif accuracy_level == "high":
            # Better quality
            if processing_speed not in ["fast", "balanced"]:
                settings['threshold_method'] = "Adaptive Gaussian"
                settings['block_size'] = max(settings.get('block_size', 11), 13)
        elif accuracy_level == "maximum":
            # Best quality
            settings['threshold_method'] = "Otsu"
            settings['block_size'] = max(settings.get('block_size', 11), 15)
            settings['c_value'] = max(settings.get('c_value', 2), 3)
        
        return settings
    
    def _get_ocr_settings(self, processing_speed: str, accuracy_level: str) -> str:
        """Get Tesseract OCR configuration based on speed and accuracy preferences"""
        config_parts = []
        
        # Processing speed affects OCR engine mode
        if processing_speed == "fast":
            config_parts.append("--oem 1")  # LSTM only (faster)
            config_parts.append("--psm 6")  # Uniform block of text
        elif processing_speed == "balanced":
            config_parts.append("--oem 3")  # Default (LSTM + Legacy)
            config_parts.append("--psm 6")  # Uniform block of text
        elif processing_speed == "high":
            config_parts.append("--oem 3")  # Default (LSTM + Legacy)
            config_parts.append("--psm 3")  # Fully automatic page segmentation
        elif processing_speed == "maximum":
            config_parts.append("--oem 3")  # Default (LSTM + Legacy)
            config_parts.append("--psm 1")  # Automatic page segmentation with OSD
        
        # Accuracy level affects additional settings
        if accuracy_level == "low":
            # Basic settings
            pass
        elif accuracy_level == "medium":
            config_parts.append("--tessdata-dir .")  # Use default tessdata
        elif accuracy_level == "high":
            config_parts.append("--tessdata-dir .")
            config_parts.append("--user-words")  # Use user words
        elif accuracy_level == "maximum":
            config_parts.append("--tessdata-dir .")
            config_parts.append("--user-words")
            config_parts.append("--user-patterns")  # Use user patterns
            config_parts.append("--c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
        
        return " ".join(config_parts)
    
    async def extract_text(self, image: np.ndarray, use_preprocessing: bool = True,
                          blur_kernel: int = 5, threshold_method: str = "Adaptive Gaussian",
                          block_size: int = 11, c_value: int = 2,
                          processing_speed: str = "balanced", accuracy_level: str = "high") -> Dict[str, Any]:
        """
        Extract text using Tesseract OCR
        """
        if not self.model_loaded:
            raise Exception("Tesseract not properly initialized")
        
        start_time = time.time()
        
        try:
            # Apply processing speed and accuracy level settings
            preprocessing_settings = self._get_preprocessing_settings(processing_speed, accuracy_level)
            ocr_settings = self._get_ocr_settings(processing_speed, accuracy_level)
            
            # Preprocess image if requested
            if use_preprocessing:
                # Use adjusted preprocessing settings based on speed/accuracy
                adjusted_blur = preprocessing_settings.get('blur_kernel', blur_kernel)
                adjusted_threshold = preprocessing_settings.get('threshold_method', threshold_method)
                adjusted_block_size = preprocessing_settings.get('block_size', block_size)
                adjusted_c_value = preprocessing_settings.get('c_value', c_value)
                
                processed_image = self.preprocess_image(
                    image, adjusted_blur, adjusted_threshold, adjusted_block_size, adjusted_c_value
                )
                # Convert to PIL Image for Tesseract
                pil_image = Image.fromarray(processed_image)
            else:
                # Use original image
                pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            # Extract text with Tesseract using adjusted settings
            extracted_text = pytesseract.image_to_string(pil_image, config=ocr_settings)
            
            # Get confidence data
            try:
                data = pytesseract.image_to_data(pil_image, output_type=pytesseract.Output.DICT)
                confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            except:
                avg_confidence = 0.95  # Default confidence
            
            processing_time = time.time() - start_time
            
            return {
                "text": extracted_text.strip(),
                "confidence": avg_confidence / 100.0,  # Convert to 0-1 scale
                "processing_time": processing_time
            }
            
        except Exception as e:
            raise Exception(f"Tesseract OCR failed: {str(e)}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        return {
            "loaded": self.model_loaded,
            "status": self.status,
            "type": "Tesseract OCR",
            "version": str(pytesseract.get_tesseract_version()) if self.model_loaded else "Unknown"
        }
