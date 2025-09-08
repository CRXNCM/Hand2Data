import React, { useState, useRef, useEffect, useCallback } from "react";
import { ocrAPI, utils } from "../services/api";

const PreprocessOCR = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [processedImage, setProcessedImage] = useState(null);
  const [processingTime, setProcessingTime] = useState(0);
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(true);
  const [isLiveProcessing, setIsLiveProcessing] = useState(false);
  
  // Preprocessing parameters
  const [blurKernel, setBlurKernel] = useState(5);
  const [thresholdMethod, setThresholdMethod] = useState("Adaptive Gaussian");
  const [blockSize, setBlockSize] = useState(11);
  const [cValue, setCValue] = useState(2);
  const [simpleThreshValue, setSimpleThreshValue] = useState(127);
  
  const fileInputRef = useRef(null);
  const livePreviewTimeoutRef = useRef(null);

  // Preprocessing presets
  const presets = {
    "Handwriting": {
      blurKernel: 3,
      thresholdMethod: "Adaptive Gaussian",
      blockSize: 15,
      cValue: 2,
      simpleThreshValue: 127
    },
    "Printed Text": {
      blurKernel: 5,
      thresholdMethod: "Adaptive Gaussian",
      blockSize: 11,
      cValue: 2,
      simpleThreshValue: 127
    },
    "Low Quality": {
      blurKernel: 7,
      thresholdMethod: "Adaptive Mean",
      blockSize: 19,
      cValue: 4,
      simpleThreshValue: 127
    },
    "High Contrast": {
      blurKernel: 3,
      thresholdMethod: "Simple",
      blockSize: 11,
      cValue: 2,
      simpleThreshValue: 180
    },
    "Faded Text": {
      blurKernel: 5,
      thresholdMethod: "Adaptive Gaussian",
      blockSize: 15,
      cValue: 6,
      simpleThreshValue: 127
    },
    "Default": {
      blurKernel: 5,
      thresholdMethod: "Adaptive Gaussian",
      blockSize: 11,
      cValue: 2,
      simpleThreshValue: 127
    }
  };

  // Apply preset
  const applyPreset = (presetName) => {
    const preset = presets[presetName];
    if (preset) {
      setBlurKernel(preset.blurKernel);
      setThresholdMethod(preset.thresholdMethod);
      setBlockSize(preset.blockSize);
      setCValue(preset.cValue);
      setSimpleThreshValue(preset.simpleThreshValue);
    }
  };

  // Live preview processing with debouncing
  const processImageLive = useCallback(async () => {
    if (!selectedFile || !livePreviewEnabled || isLiveProcessing) return;

    // Clear existing timeout
    if (livePreviewTimeoutRef.current) {
      clearTimeout(livePreviewTimeoutRef.current);
    }

    // Debounce the live preview
    livePreviewTimeoutRef.current = setTimeout(async () => {
      setIsLiveProcessing(true);
      try {
        const result = await ocrAPI.preprocessImage(selectedFile, {
          blurKernel,
          thresholdMethod,
          blockSize,
          cValue,
          simpleThreshValue,
        });

        if (result.success) {
          setProcessedImage(result.processed_image);
        }
      } catch (err) {
        console.warn("Live preview error:", err.message);
      } finally {
        setIsLiveProcessing(false);
      }
    }, 500); // 500ms debounce
  }, [selectedFile, livePreviewEnabled, blurKernel, thresholdMethod, blockSize, cValue, simpleThreshValue, isLiveProcessing]);

  // Trigger live preview when parameters change
  useEffect(() => {
    if (selectedFile && livePreviewEnabled) {
      processImageLive();
    }
  }, [blurKernel, thresholdMethod, blockSize, cValue, simpleThreshValue, processImageLive]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (livePreviewTimeoutRef.current) {
        clearTimeout(livePreviewTimeoutRef.current);
      }
    };
  }, []);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!utils.validateImageFile(file)) {
      setErrorMessage(`Unsupported file type: ${file.type}. Upload a valid image.`);
      return;
    }

    setSelectedFile(file);
    setFilePreview(utils.createFilePreview(file));
    setErrorMessage("");
    setProcessedImage(null);
    setProcessingTime(0);
    
    // Trigger live preview if enabled
    if (livePreviewEnabled) {
      setTimeout(() => processImageLive(), 100);
    }
  };

  // Process image with backend
  const processImage = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setProcessedImage(null);

    try {
      const startTime = performance.now();
      
      const result = await ocrAPI.preprocessImage(selectedFile, {
        blurKernel,
        thresholdMethod,
        blockSize,
        cValue,
        simpleThreshValue,
      });

      const endTime = performance.now();
      setProcessingTime(utils.formatTime((endTime - startTime) / 1000));
      
      if (result.success) {
        setProcessedImage(result.processed_image);
      } else {
        throw new Error("Processing failed");
      }
    } catch (err) {
      setErrorMessage(`Error processing image: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download processed image
  const downloadProcessedImage = () => {
    if (!processedImage || !selectedFile) return;
    
    utils.downloadFile(processedImage, `processed_${selectedFile.name}`);
  };

  // Reset all settings
  const resetSettings = () => {
    setBlurKernel(5);
    setThresholdMethod("Adaptive Gaussian");
    setBlockSize(11);
    setCValue(2);
    setSimpleThreshValue(127);
  };

  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">OCR Image Preprocessing</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div className="space-y-6">
          {/* Image Upload */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-4">Image Upload</h2>
            
            <div className="mb-4">
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept="image/*"
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-indigo-600 file:text-white
                  hover:file:bg-indigo-700"
              />
            </div>
            
            {filePreview && (
              <div className="mt-4">
                <img 
                  src={filePreview} 
                  alt="Original" 
                  className="max-w-full h-auto max-h-64 rounded border border-gray-700" 
                />
                <p className="text-sm text-gray-400 mt-2">Original Image</p>
              </div>
            )}
          </div>
          
          {/* Preprocessing Controls */}
          <div className="bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Preprocessing Settings</h2>
              <button
                onClick={resetSettings}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Reset
              </button>
            </div>
            
            {/* Live Preview Toggle */}
            <div className="mb-4 p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Live Preview</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={livePreviewEnabled}
                    onChange={(e) => setLivePreviewEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {livePreviewEnabled ? "Real-time updates as you adjust parameters" : "Manual processing only"}
              </p>
            </div>
            
            {/* Presets */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Quick Presets</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(presets).map((presetName) => (
                  <button
                    key={presetName}
                    onClick={() => applyPreset(presetName)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition-colors"
                  >
                    {presetName}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-4">
              {/* Blur Kernel Size */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Blur Kernel Size: {blurKernel}
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="2"
                  value={blurKernel}
                  onChange={(e) => setBlurKernel(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1</span>
                  <span>15</span>
                </div>
              </div>
              
              {/* Threshold Method */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Threshold Method
                </label>
                <select
                  value={thresholdMethod}
                  onChange={(e) => setThresholdMethod(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Adaptive Gaussian">Adaptive Gaussian</option>
                  <option value="Adaptive Mean">Adaptive Mean</option>
                  <option value="Otsu">Otsu</option>
                  <option value="Simple">Simple</option>
                </select>
              </div>
              
              {/* Block Size (for adaptive methods) */}
              {(thresholdMethod === "Adaptive Gaussian" || thresholdMethod === "Adaptive Mean") && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Block Size: {blockSize}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="99"
                    step="2"
                    value={blockSize}
                    onChange={(e) => setBlockSize(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>3</span>
                    <span>99</span>
                  </div>
                </div>
              )}
              
              {/* C Value (for adaptive methods) */}
              {(thresholdMethod === "Adaptive Gaussian" || thresholdMethod === "Adaptive Mean") && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    C Value: {cValue}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    value={cValue}
                    onChange={(e) => setCValue(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-10</span>
                    <span>10</span>
                  </div>
                </div>
              )}
              
              {/* Simple Threshold Value */}
              {thresholdMethod === "Simple" && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Threshold Value: {simpleThreshValue}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={simpleThreshValue}
                    onChange={(e) => setSimpleThreshValue(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>255</span>
                  </div>
                </div>
              )}
              
              {/* Process Button */}
              <div className="pt-2">
                <button
                  onClick={processImage}
                  disabled={isProcessing || !selectedFile}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : livePreviewEnabled ? "Force Process" : "Process Image"}
                </button>
                {livePreviewEnabled && (
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    Live preview is active - image updates automatically
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Processing Status */}
          {(isProcessing || isLiveProcessing) && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold mb-4">
                {isLiveProcessing ? "Live Preview" : "Processing"}
              </h2>
              
              <div className="flex items-center space-x-3">
                <svg
                  className="animate-spin h-6 w-6 text-indigo-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 11-8 8h4z"
                  />
                </svg>
                <p className="text-gray-400">
                  {isLiveProcessing ? "Updating preview..." : "Processing image..."}
                </p>
              </div>
              {isLiveProcessing && (
                <p className="text-xs text-gray-500 mt-2">
                  Live preview updates automatically as you adjust parameters
                </p>
              )}
            </div>
          )}
          
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-400">{errorMessage}</p>
              </div>
            </div>
          )}
          
          {/* Processed Image */}
          {processedImage && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Processed Image</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={downloadProcessedImage}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                  >
                    Download
                  </button>
                </div>
              </div>
              
              <div className="mb-4">
                <img 
                  src={processedImage} 
                  alt="Processed" 
                  className="max-w-full h-auto max-h-96 rounded border border-gray-700" 
                />
              </div>
              
              <div className="text-sm text-gray-400">
                <p>Processing Time: {processingTime}s</p>
                <p>Settings Used:</p>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>• Blur Kernel: {blurKernel}</li>
                  <li>• Threshold Method: {thresholdMethod}</li>
                  {(thresholdMethod === "Adaptive Gaussian" || thresholdMethod === "Adaptive Mean") && (
                    <>
                      <li>• Block Size: {blockSize}</li>
                      <li>• C Value: {cValue}</li>
                    </>
                  )}
                  {thresholdMethod === "Simple" && (
                    <li>• Threshold Value: {simpleThreshValue}</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          
          {/* Instructions */}
          {!selectedFile && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md">
              <h2 className="text-lg font-semibold mb-4">Instructions</h2>
              <div className="text-gray-400 space-y-2">
                <p>1. Upload an image using the file input on the left</p>
                <p>2. Try the <strong>Quick Presets</strong> for common scenarios:</p>
                <ul className="ml-4 space-y-1">
                  <li>• <strong>Handwriting:</strong> Optimized for handwritten text</li>
                  <li>• <strong>Printed Text:</strong> Best for clear printed documents</li>
                  <li>• <strong>Low Quality:</strong> For blurry or noisy images</li>
                  <li>• <strong>High Contrast:</strong> For very dark/light images</li>
                  <li>• <strong>Faded Text:</strong> For old or faded documents</li>
                </ul>
                <p>3. Enable <strong>Live Preview</strong> to see changes in real-time</p>
                <p>4. Fine-tune parameters manually if needed</p>
                <p>5. Download the processed image for use in OCR</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreprocessOCR;
