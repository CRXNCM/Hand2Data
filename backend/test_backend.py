#!/usr/bin/env python3
"""
Test script for Hand2File Backend
"""
import requests
import json
from pathlib import Path

def test_health_endpoint():
    """Test the health check endpoint"""
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_models_status():
    """Test the models status endpoint"""
    try:
        response = requests.get("http://localhost:8000/api/ocr/models/status")
        if response.status_code == 200:
            print("✅ Models status check passed")
            data = response.json()
            print(f"Tesseract: {data.get('tesseract', {}).get('status', 'Unknown')}")
            print(f"TrOCR: {data.get('trocr', {}).get('status', 'Unknown')}")
            return True
        else:
            print(f"❌ Models status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Models status check failed: {e}")
        return False

def test_ocr_with_sample_image():
    """Test OCR with a sample image (if available)"""
    # Look for a sample image in the uploads directory
    sample_images = list(Path("uploads").glob("*.png")) + list(Path("uploads").glob("*.jpg"))
    
    if not sample_images:
        print("⚠️  No sample images found in uploads directory")
        return True
    
    sample_image = sample_images[0]
    print(f"Testing OCR with sample image: {sample_image}")
    
    try:
        with open(sample_image, 'rb') as f:
            files = {'file': f}
            data = {
                'ocr_type': 'trocr',
                'use_preprocessing': 'true'
            }
            
            response = requests.post("http://localhost:8000/api/ocr/extract-text", 
                                   files=files, data=data)
            
            if response.status_code == 200:
                result = response.json()
                print("✅ OCR test passed")
                print(f"Extracted text: {result.get('text', 'No text')[:100]}...")
                print(f"Confidence: {result.get('confidence', 0)}")
                print(f"Processing time: {result.get('processing_time', 0):.2f}s")
                return True
            else:
                print(f"❌ OCR test failed: {response.status_code}")
                print(f"Error: {response.text}")
                return False
                
    except Exception as e:
        print(f"❌ OCR test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Hand2File Backend API")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_endpoint),
        ("Models Status", test_models_status),
        ("OCR Processing", test_ocr_with_sample_image)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name}...")
        if test_func():
            passed += 1
        print("-" * 30)
    
    print(f"\n📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Backend is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
