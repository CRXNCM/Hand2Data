import torch
import cv2
import numpy as np
from PIL import Image
import time
import os
import subprocess
import sys
from typing import Dict, Any, Optional
from transformers import TrOCRProcessor, VisionEncoderDecoderModel

class TrOCRService:
    def __init__(self):
        self.model_loaded = False
        self.status = "Not loaded - Use download_models() to load TrOCR"
        self.processor = None
        self.model = None
        self.device = None
        self.model_dir = None
        self.current_model_type = None
        self.available_models = {
            "small-handwritten": {
                "repo": "microsoft/trocr-small-handwritten",
                "size": "~150 MB"
            },
            "small-printed": {
                "repo": "microsoft/trocr-small-printed",
                "size": "~150 MB"
            },
            "base-handwritten": {
                "repo": "microsoft/trocr-base-handwritten",
                "size": "~450 MB"
            },
            "base-printed": {
                "repo": "microsoft/trocr-base-printed",
                "size": "~450 MB"
            },
            "large-handwritten": {
                "repo": "microsoft/trocr-large-handwritten",
                "size": "~1.4 GB"
            },
            "large-printed": {
                "repo": "microsoft/trocr-large-printed",
                "size": "~1.4 GB"
            }
        }
        # Don't auto-load model - user can download it later
        # self._load_model()
    
    def _get_model_path(self, model_type="large-handwritten"):
        """Get the local model directory path for a specific model type"""
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up to backend directory, then to python_ocr
        backend_dir = os.path.dirname(os.path.dirname(current_dir))
        python_ocr_dir = os.path.join(backend_dir, "python_ocr")
        model_dir = os.path.join(python_ocr_dir, f"trocr-{model_type}")
        return model_dir

    def _check_local_model(self, model_type="large-handwritten"):
        """Check if local model exists for a specific model type"""
        model_dir = self._get_model_path(model_type)
        if os.path.exists(model_dir):
            # Check if both processor and model files exist
            processor_files = ["tokenizer.json", "tokenizer_config.json", "preprocessor_config.json"]
            model_files = ["config.json", "pytorch_model.bin"]
            
            processor_exists = all(os.path.exists(os.path.join(model_dir, f)) for f in processor_files)
            model_exists = all(os.path.exists(os.path.join(model_dir, f)) for f in model_files)
            
            return processor_exists and model_exists, model_dir
        return False, None

    def get_available_models(self):
        """Get list of available models"""
        return self.available_models

    def get_installed_models(self):
        """Get list of locally installed models"""
        installed = []
        for model_type in self.available_models.keys():
            exists, model_dir = self._check_local_model(model_type)
            if exists:
                installed.append({
                    "type": model_type,
                    "repo": self.available_models[model_type]["repo"],
                    "size": self.available_models[model_type]["size"],
                    "path": model_dir
                })
        return installed

    def _load_model(self, model_type="large-handwritten"):
        """Load TrOCR model from local cache or download if needed"""
        try:
            # Configure CUDA for maximum GPU utilization
            if torch.cuda.is_available():
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
                torch.cuda.empty_cache()
                torch.backends.cudnn.benchmark = True
                
                gpu_name = torch.cuda.get_device_name(0)
                gpu_memory = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                gpu_info = f"{gpu_name} ({gpu_memory:.2f} GB)"
            else:
                gpu_info = "Not available"
            
            # Get model repository name
            model_repo = self.available_models[model_type]["repo"]
            
            # Check for local model first
            local_exists, model_dir = self._check_local_model(model_type)
            
            if local_exists:
                # Load from local cache
                self.status = f"Loading TrOCR {model_type} model from local cache..."
                self.processor = TrOCRProcessor.from_pretrained(model_dir, use_fast=True)
                self.model = VisionEncoderDecoderModel.from_pretrained(model_dir)
                self.model_dir = model_dir
                self.current_model_type = model_type
            else:
                # Download and load from Hugging Face
                self.status = f"Downloading TrOCR {model_type} model from Hugging Face..."
                self.processor = TrOCRProcessor.from_pretrained(model_repo, use_fast=True)
                self.model = VisionEncoderDecoderModel.from_pretrained(model_repo)
                self.model_dir = model_repo
                self.current_model_type = model_type
            
            # Move to device
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            self.model.to(self.device)
            
            self.model_loaded = True
            self.status = f"Ready - {model_type} - Using {self.device.upper()} - {gpu_info}"
            
        except Exception as e:
            self.status = f"Error loading TrOCR {model_type} model: {str(e)}"
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
    
    def _get_generation_config(self, processing_speed: str, accuracy_level: str) -> Dict[str, Any]:
        """Get TrOCR generation configuration based on speed and accuracy preferences"""
        config = {
            "max_length": 128,
            "early_stopping": True
        }
        
        # Processing speed affects generation parameters
        if processing_speed == "fast":
            config.update({
                "num_beams": 1,  # Greedy decoding (fastest)
                "do_sample": False,
                "temperature": 1.0
            })
        elif processing_speed == "balanced":
            config.update({
                "num_beams": 3,  # Moderate beam search
                "do_sample": False,
                "temperature": 1.0
            })
        elif processing_speed == "high":
            config.update({
                "num_beams": 5,  # Better beam search
                "do_sample": False,
                "temperature": 1.0
            })
        elif processing_speed == "maximum":
            config.update({
                "num_beams": 8,  # Best beam search
                "do_sample": True,  # Sampling for better quality
                "temperature": 0.8,  # Slightly lower temperature for more focused generation
                "top_p": 0.9,  # Nucleus sampling
                "top_k": 50  # Top-k sampling
            })
        
        # Accuracy level affects additional parameters
        if accuracy_level == "low":
            # Keep current settings (faster)
            pass
        elif accuracy_level == "medium":
            # Slight improvement
            if processing_speed not in ["fast"]:
                config["num_beams"] = max(config.get("num_beams", 1), 3)
        elif accuracy_level == "high":
            # Better quality
            if processing_speed not in ["fast", "balanced"]:
                config["num_beams"] = max(config.get("num_beams", 1), 5)
                config["max_length"] = 150  # Longer sequences
        elif accuracy_level == "maximum":
            # Best quality
            config["num_beams"] = max(config.get("num_beams", 1), 8)
            config["max_length"] = 200  # Longest sequences
            config["do_sample"] = True
            config["temperature"] = 0.7
            config["top_p"] = 0.9
            config["top_k"] = 50
        
        return config
    
    async def extract_text(self, image: np.ndarray, use_preprocessing: bool = True,
                          blur_kernel: int = 5, threshold_method: str = "Adaptive Gaussian",
                          block_size: int = 11, c_value: int = 2,
                          processing_speed: str = "balanced", accuracy_level: str = "high") -> Dict[str, Any]:
        """
        Extract text using TrOCR
        """
        if not self.model_loaded:
            raise Exception("TrOCR model not properly loaded")
        
        start_time = time.time()
        
        try:
            # Preprocess image if requested
            if use_preprocessing:
                processed_image = self.preprocess_image(
                    image, blur_kernel, threshold_method, block_size, c_value
                )
                # Convert to PIL Image for TrOCR
                pil_image = Image.fromarray(processed_image)
            else:
                # Use original image
                pil_image = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
            
            # Process with TrOCR
            pixel_values = self.processor(pil_image, return_tensors="pt").pixel_values.to(self.device)
            
            # Apply processing speed and accuracy level settings
            generation_config = self._get_generation_config(processing_speed, accuracy_level)
            
            # Generate text with adjusted settings
            with torch.no_grad():
                generated_ids = self.model.generate(
                    pixel_values,
                    **generation_config
                )
            
            # Decode the generated IDs to text
            extracted_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            
            processing_time = time.time() - start_time
            
            return {
                "text": extracted_text.strip(),
                "confidence": 0.95,  # TrOCR doesn't provide confidence scores
                "processing_time": processing_time
            }
            
        except Exception as e:
            raise Exception(f"TrOCR processing failed: {str(e)}")
    
    async def download_model(self, model_type="large-handwritten") -> Dict[str, Any]:
        """Download TrOCR model using the standalone script"""
        try:
            # Validate model type
            if model_type not in self.available_models:
                return {
                    "success": False,
                    "message": f"Invalid model type: {model_type}. Available types: {list(self.available_models.keys())}",
                    "status": "Error"
                }
            
            # Check if model is already loaded
            if self.model_loaded and self.current_model_type == model_type:
                return {
                    "success": True,
                    "message": f"Model {model_type} already loaded",
                    "status": self.status
                }
            
            # Check if local model exists
            local_exists, model_dir = self._check_local_model(model_type)
            if local_exists:
                self.status = f"Local {model_type} model found, loading..."
                self._load_model(model_type)
                return {
                    "success": True,
                    "message": f"Model {model_type} loaded from local cache",
                    "status": self.status
                }
            
            # Run the standalone download script with model selection
            self.status = f"Downloading TrOCR {model_type} model... This may take several minutes."
            
            # Get the path to the download script
            current_dir = os.path.dirname(os.path.abspath(__file__))
            backend_dir = os.path.dirname(os.path.dirname(current_dir))
            download_script = os.path.join(backend_dir, "python_ocr", "download_model.py")
            
            # Create a temporary script that selects the specific model
            temp_script = os.path.join(backend_dir, "python_ocr", "temp_download.py")
            with open(temp_script, "w") as f:
                f.write(f"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from download_model import AVAILABLE_MODELS, download_model

# Override the choose_model function to select specific model
def choose_model():
    return "{model_type}", AVAILABLE_MODELS["{model_type}"]["repo"]

# Import and override the function
import download_model
download_model.choose_model = choose_model

# Run the download
download_model.download_model()
""")
            
            try:
                # Run the temporary script with timeout
                result = subprocess.run(
                    [sys.executable, temp_script],
                    capture_output=True,
                    text=True,
                    cwd=os.path.dirname(download_script),
                    timeout=300  # 5 minute timeout
                )
                
                # Clean up temporary script
                if os.path.exists(temp_script):
                    os.remove(temp_script)
                
                if result.returncode == 0:
                    # Model downloaded successfully, now load it
                    self._load_model(model_type)
                    return {
                        "success": True,
                        "message": f"Model {model_type} downloaded and loaded successfully",
                        "status": self.status,
                        "output": result.stdout
                    }
                else:
                    error_msg = f"Download script failed: {result.stderr}"
                    self.status = f"Error: {error_msg}"
                    return {
                        "success": False,
                        "message": error_msg,
                        "status": self.status,
                        "output": result.stdout,
                        "error": result.stderr
                    }
                    
            except subprocess.TimeoutExpired:
                # Clean up temporary script
                if os.path.exists(temp_script):
                    os.remove(temp_script)
                
                error_msg = "Model download timed out after 5 minutes"
                self.status = f"Error: {error_msg}"
                return {
                    "success": False,
                    "message": error_msg,
                    "status": self.status
                }
            except KeyboardInterrupt:
                # Clean up temporary script
                if os.path.exists(temp_script):
                    os.remove(temp_script)
                
                error_msg = "Model download was interrupted"
                self.status = f"Error: {error_msg}"
                return {
                    "success": False,
                    "message": error_msg,
                    "status": self.status
                }
            except Exception as e:
                # Clean up temporary script
                if os.path.exists(temp_script):
                    os.remove(temp_script)
                
                error_msg = f"Download script execution failed: {str(e)}"
                self.status = f"Error: {error_msg}"
                return {
                    "success": False,
                    "message": error_msg,
                    "status": self.status
                }
            
        except Exception as e:
            error_msg = f"Model download failed: {str(e)}"
            self.status = error_msg
            return {
                "success": False,
                "message": error_msg,
                "status": self.status
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Get service status"""
        return {
            "loaded": self.model_loaded,
            "status": self.status,
            "current_model_type": self.current_model_type,
            "device": str(self.device) if self.device else "Unknown",
            "model_repo": self.available_models.get(self.current_model_type, {}).get("repo", "Unknown") if self.current_model_type else "None",
            "available_models": self.available_models,
            "installed_models": self.get_installed_models()
        }
