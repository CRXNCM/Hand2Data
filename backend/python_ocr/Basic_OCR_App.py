import cv2
import pytesseract
from PIL import Image
import os
import sys
import time
from typing import Optional, Dict, Any

class BasicOCRProcessor:
    def __init__(self):
        """Initialize the OCR processor"""
        self.setup_tesseract()
    
    def setup_tesseract(self):
        """Setup Tesseract OCR"""
        try:
            # For Windows, set the path to Tesseract
            if os.name == 'nt':  # Windows
                tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
                if os.path.exists(tesseract_path):
                    pytesseract.pytesseract.tesseract_cmd = tesseract_path
            
            # Test Tesseract
            version = pytesseract.get_tesseract_version()
            print(f"✅ Tesseract OCR {version} initialized successfully")
            return True
        except Exception as e:
            print(f"❌ Error initializing Tesseract: {str(e)}")
            return False
    
    def load_image(self, image_path: str) -> Optional[Any]:
        """Load an image from file path"""
        try:
            if not os.path.exists(image_path):
                print(f"❌ Error: File not found: {image_path}")
                return None
            
            # Load the image using OpenCV
            image = cv2.imread(image_path)
            
            if image is None:
                print(f"❌ Error: Could not load the image file: {image_path}")
                return None
            
            print(f"✅ Loaded image: {os.path.basename(image_path)} ({image.shape[1]}x{image.shape[0]} pixels)")
            return image
            
        except Exception as e:
            print(f"❌ Error loading image: {str(e)}")
            return None
    
    def process_image(self, image: Any, use_preprocessing: bool = True) -> Dict[str, Any]:
        """Process image and extract text using OCR"""
        if image is None:
            return {"success": False, "error": "No image provided"}
        
        try:
            start_time = time.time()
            print("🔄 Processing image...")
            
            if use_preprocessing:
                # Convert image to grayscale (improves OCR accuracy)
                processed_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                print("📸 Applied grayscale preprocessing")
            else:
                processed_image = image
            
            # Apply OCR
            extracted_text = pytesseract.image_to_string(processed_image)
            
            # Get confidence data
            try:
                data = pytesseract.image_to_data(processed_image, output_type=pytesseract.Output.DICT)
                confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            except:
                avg_confidence = 0.95  # Default confidence
            
            processing_time = time.time() - start_time
            
            print(f"✅ Text extraction completed in {processing_time:.2f}s")
            print(f"📊 Confidence: {avg_confidence:.1f}%")
            
            return {
                "success": True,
                "text": extracted_text.strip(),
                "confidence": avg_confidence / 100.0,
                "processing_time": processing_time,
                "preprocessing_used": use_preprocessing
            }
            
        except Exception as e:
            print(f"❌ OCR processing failed: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def save_text(self, text: str, output_path: str) -> bool:
        """Save extracted text to file"""
        try:
            if not text.strip():
                print("⚠️ No text to save")
                return False
            
            with open(output_path, 'w', encoding='utf-8') as file:
                file.write(text)
            
            print(f"💾 Text saved to: {output_path}")
            return True
            
        except Exception as e:
            print(f"❌ Error saving text: {str(e)}")
            return False
    
    def process_file(self, input_path: str, output_path: Optional[str] = None, use_preprocessing: bool = True) -> Dict[str, Any]:
        """Complete workflow: load image, process, and optionally save text"""
        print(f"\n🚀 Starting OCR processing for: {input_path}")
        
        # Load image
        image = self.load_image(input_path)
        if image is None:
            return {"success": False, "error": "Failed to load image"}
        
        # Process image
        result = self.process_image(image, use_preprocessing)
        if not result["success"]:
            return result
        
        # Save text if output path provided
        if output_path and result["text"]:
            self.save_text(result["text"], output_path)
        
        # Display extracted text
        print(f"\n📝 Extracted Text:")
        print("-" * 50)
        print(result["text"])
        print("-" * 50)
        
        return result

def main():
    """Main function for console usage"""
    print("🔍 Basic OCR Processor - Console Mode")
    print("=" * 50)
    
    # Initialize OCR processor
    ocr = BasicOCRProcessor()
    
    # Check if command line arguments provided
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        
        # Process file from command line
        result = ocr.process_file(input_file, output_file)
        
        if result["success"]:
            print(f"\n🎉 Processing completed successfully!")
            if output_file:
                print(f"📄 Text saved to: {output_file}")
        else:
            print(f"\n❌ Processing failed: {result.get('error', 'Unknown error')}")
            sys.exit(1)
        else:
        # Interactive mode
        print("\n📋 Interactive Mode:")
        print("Enter image file path (or 'quit' to exit):")
        
        while True:
            try:
                user_input = input("\n🖼️  Image path: ").strip()
                
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("👋 Goodbye!")
                    break
                
                if not user_input:
                    print("⚠️ Please enter a valid file path")
                    continue
                
                # Ask for output file
                save_option = input("💾 Save text to file? (y/n): ").strip().lower()
                output_file = None
                
                if save_option in ['y', 'yes']:
                    output_file = input("📄 Output file path: ").strip()
                    if not output_file:
                        output_file = "extracted_text.txt"
                
                # Process the file
                result = ocr.process_file(user_input, output_file)
                
                if not result["success"]:
                    print(f"❌ Error: {result.get('error', 'Unknown error')}")
                
            except KeyboardInterrupt:
                print("\n\n👋 Goodbye!")
                break
        except Exception as e:
                print(f"❌ Unexpected error: {str(e)}")

if __name__ == "__main__":
    main()
