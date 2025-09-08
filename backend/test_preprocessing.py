#!/usr/bin/env python3
"""
Test script for image preprocessing functionality
"""
import requests
import os
from pathlib import Path

def test_preprocessing_with_sample():
    """Test preprocessing with a sample image"""
    
    # Check if we have any images in the uploads directory
    upload_dir = Path("uploads")
    if not upload_dir.exists():
        upload_dir.mkdir(exist_ok=True)
    
    # Look for existing images
    sample_images = []
    for ext in ['*.png', '*.jpg', '*.jpeg', '*.bmp']:
        sample_images.extend(upload_dir.glob(ext))
    
    if not sample_images:
        print("❌ No sample images found in uploads directory")
        print("📁 Please add an image file to the 'uploads' folder and try again")
        return False
    
    # Use the first image found
    sample_image = sample_images[0]
    print(f"🖼️  Testing with image: {sample_image.name}")
    
    try:
        # Test different preprocessing settings
        test_cases = [
            {
                "name": "Default Settings",
                "params": {
                    "blur_kernel": 5,
                    "threshold_method": "Adaptive Gaussian",
                    "block_size": 11,
                    "c_value": 2
                }
            },
            {
                "name": "High Blur",
                "params": {
                    "blur_kernel": 9,
                    "threshold_method": "Adaptive Gaussian",
                    "block_size": 11,
                    "c_value": 2
                }
            },
            {
                "name": "Otsu Threshold",
                "params": {
                    "blur_kernel": 5,
                    "threshold_method": "Otsu",
                    "block_size": 11,
                    "c_value": 2
                }
            },
            {
                "name": "Simple Threshold",
                "params": {
                    "blur_kernel": 5,
                    "threshold_method": "Simple",
                    "block_size": 11,
                    "c_value": 2,
                    "simple_thresh_value": 150
                }
            }
        ]
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n🧪 Test {i}: {test_case['name']}")
            print(f"   Parameters: {test_case['params']}")
            
            # Prepare the request
            with open(sample_image, 'rb') as f:
                files = {'file': f}
                data = test_case['params']
                
                response = requests.post(
                    "http://localhost:8000/api/ocr/preprocess",
                    files=files,
                    data=data
                )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    print(f"   ✅ Success! Processed image size: {len(result['processed_image'])} characters")
                    
                    # Save the processed image
                    import base64
                    processed_data = result['processed_image'].split(',')[1]
                    processed_bytes = base64.b64decode(processed_data)
                    
                    output_path = upload_dir / f"processed_{i}_{test_case['name'].replace(' ', '_').lower()}.png"
                    with open(output_path, 'wb') as f:
                        f.write(processed_bytes)
                    print(f"   💾 Saved processed image: {output_path.name}")
                else:
                    print(f"   ❌ Failed: {result.get('message', 'Unknown error')}")
            else:
                print(f"   ❌ HTTP Error {response.status_code}: {response.text}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_ocr_with_preprocessing():
    """Test OCR with preprocessing"""
    
    # Look for sample images
    upload_dir = Path("uploads")
    sample_images = []
    for ext in ['*.png', '*.jpg', '*.jpeg', '*.bmp']:
        sample_images.extend(upload_dir.glob(ext))
    
    if not sample_images:
        print("❌ No sample images found for OCR test")
        return False
    
    sample_image = sample_images[0]
    print(f"\n🔍 Testing OCR with preprocessing on: {sample_image.name}")
    
    try:
        with open(sample_image, 'rb') as f:
            files = {'file': f}
            data = {
                'ocr_type': 'tesseract',
                'use_preprocessing': 'true',
                'blur_kernel': 5,
                'threshold_method': 'Adaptive Gaussian'
            }
            
            response = requests.post(
                "http://localhost:8000/api/ocr/extract-text",
                files=files,
                data=data
            )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ OCR with preprocessing successful!")
                print(f"📝 Extracted text: {result['text'][:100]}...")
                print(f"🎯 Confidence: {result['confidence']:.2%}")
                print(f"⏱️  Processing time: {result['processing_time']:.2f}s")
                return True
            else:
                print(f"❌ OCR failed: {result.get('message', 'Unknown error')}")
        else:
            print(f"❌ HTTP Error {response.status_code}: {response.text}")
            
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
    
    return False

def main():
    """Run all preprocessing tests"""
    print("🧪 Testing Hand2File Preprocessing Functionality")
    print("=" * 60)
    
    # Test 1: Image preprocessing
    print("\n1️⃣ Testing Image Preprocessing...")
    preprocessing_success = test_preprocessing_with_sample()
    
    # Test 2: OCR with preprocessing
    print("\n2️⃣ Testing OCR with Preprocessing...")
    ocr_success = test_ocr_with_preprocessing()
    
    # Summary
    print("\n📊 Test Results:")
    print(f"   Image Preprocessing: {'✅ PASSED' if preprocessing_success else '❌ FAILED'}")
    print(f"   OCR with Preprocessing: {'✅ PASSED' if ocr_success else '❌ FAILED'}")
    
    if preprocessing_success and ocr_success:
        print("\n🎉 All tests passed! Your preprocessing functionality is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
