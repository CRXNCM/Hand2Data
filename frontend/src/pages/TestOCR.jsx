import React, { useState, useEffect, useCallback } from "react";
import Tesseract from "tesseract.js";

const TestOCR = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [preprocessMethod, setPreprocessMethod] = useState("none");
  const [ocrEngine, setOcrEngine] = useState("tesseract");
  const [language, setLanguage] = useState("eng");
  const [results, setResults] = useState([]);

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validImageTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/bmp",
      "image/webp",
    ];

    if (!validImageTypes.includes(file.type)) {
      setErrorMessage(`Unsupported file type: ${file.type}. Upload a valid image.`);
      return;
    }

    setSelectedFile(file);
    setFilePreview(URL.createObjectURL(file));
    setErrorMessage("");
    setOcrText("");
    setProgress(0);
    setCurrentStep("");
  };

  // Preprocess image (simulated)
  const preprocessImage = async (file, method) => {
    // In a real implementation, you would send the image to a backend service
    // for preprocessing. Here we're just simulating the process.
    setCurrentStep(`Preprocessing with ${method}...`);
    
    // Simulate preprocessing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // For now, just return the original file
    // In a real implementation, this would return the processed image
    return file;
  };

  // Process image with Tesseract
  const processTesseract = async (file) => {
    setCurrentStep("Initializing Tesseract...");
    setProgress(20);
    
    try {
      setCurrentStep("Processing image...");
      setProgress(50);
      
      const { data } = await Tesseract.recognize(file, language);
      
      setProgress(90);
      setCurrentStep("Finalizing results...");

      if (data.text) {
        setProgress(100);
        return data.text;
      } else {
        throw new Error("No text detected");
      }
    } catch (err) {
      console.error("Tesseract OCR error:", err);
      throw err;
    }
  };

  // Process image with TrOCR (simulated)
  const processTrOCR = async (file) => {
    // This is a simulation - in a real implementation, you would call a backend API
    setCurrentStep("Initializing TrOCR...");
    setProgress(10);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    setProgress(50);
    setCurrentStep("Processing with TrOCR...");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setProgress(90);
    
    // Simulate a response
    // In a real implementation, this would be the result from the backend
    return "This is a simulated TrOCR result. In a real implementation, this would be processed by a backend service using the Microsoft TrOCR model.";
  };

  // Run OCR process
  const runOCR = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");
    setProgress(0);
    setOcrText("");

    try {
      // Step 1: Preprocess the image if needed
      const processedFile = preprocessMethod !== "none" 
        ? await preprocessImage(selectedFile, preprocessMethod)
        : selectedFile;

      // Step 2: Run OCR with selected engine
      let text;
      const startTime = performance.now();
      
      if (ocrEngine === "tesseract") {
        text = await processTesseract(processedFile);
      } else if (ocrEngine === "trocr") {
        text = await processTrOCR(processedFile);
      }
      
      const endTime = performance.now();
      const processingTime = ((endTime - startTime) / 1000).toFixed(2);

      // Step 3: Update results
      setOcrText(text);
      
      // Add to results history
      const newResult = {
        id: Date.now(),
        engine: ocrEngine,
        preprocess: preprocessMethod,
        language: language,
        text: text,
        time: processingTime,
      };
      
      setResults(prev => [newResult, ...prev]);
    } catch (err) {
      setErrorMessage(
        err.name === "DataCloneError"
          ? "DataCloneError: Browser limitation with Web Workers. Try a simpler image or different browser."
          : `Error processing image: ${err.message || "Unknown error"}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear current results
  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">OCR Testing Lab</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Controls */}
        <div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-lg font-semibold mb-4">Image Upload</h2>
            
            <div className="mb-4">
              <input
                type="file"
                onChange={handleFileSelect}
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
                  alt="Preview" 
                  className="max-w-full h-auto max-h-64 rounded border border-gray-700" 
                />
              </div>
            )}
          </div>
          
          <div className="bg-gray-800 p-6 rounded-xl shadow-md">
            <h2 className="text-lg font-semibold mb-4">OCR Settings</h2>
            
            <div className="space-y-4">
              {/* OCR Engine Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  OCR Engine
                </label>
                <select
                  value={ocrEngine}
                  onChange={(e) => setOcrEngine(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="tesseract">Tesseract.js</option>
                  <option value="trocr">TrOCR (Simulated)</option>
                </select>
              </div>
              
              {/* Preprocessing Method */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Preprocessing Method
                </label>
                <select
                  value={preprocessMethod}
                  onChange={(e) => setPreprocessMethod(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="none">None</option>
                  <option value="binarization">Binarization (Simulated)</option>
                  <option value="deskew">Deskew (Simulated)</option>
                  <option value="denoise">Denoise (Simulated)</option>
                </select>
              </div>
              
              {/* Language Selection (for Tesseract) */}
              {ocrEngine === "tesseract" && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="eng">English</option>
                    <option value="fra">French</option>
                    <option value="deu">German</option>
                    <option value="spa">Spanish</option>
                  </select>
                </div>
              )}
              
              {/* Run Button */}
              <div className="pt-2">
                <button
                  onClick={runOCR}
                  disabled={isProcessing || !selectedFile}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : "Run OCR Test"}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Results */}
        <div>
          {/* Processing Status */}
          {isProcessing && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md mb-6">
              <h2 className="text-lg font-semibold mb-4">Processing</h2>
              
              <div className="space-y-4">
                <div className="flex flex-col items-center space-y-2">
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
                    <p className="text-gray-400">Processing...</p>
                  </div>
                  <div className="text-sm text-indigo-400 font-medium">{currentStep}</div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 px-1">
                  <span>{currentStep}</span>
                  <span>{progress}%</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md mb-6">
              <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-400">{errorMessage}</p>
              </div>
            </div>
          )}
          
          {/* Current Result */}
          {ocrText && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md mb-6">
              <h2 className="text-lg font-semibold mb-4">Current Result</h2>
              
              <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 max-h-80 overflow-y-auto">
                <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm">{ocrText}</pre>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => navigator.clipboard.writeText(ocrText)}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          )}
          
          {/* Results History */}
          {results.length > 0 && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Test Results History</h2>
                <button
                  onClick={clearResults}
                  className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
                >
                  Clear History
                </button>
              </div>
              
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="p-4 bg-gray-900 rounded-lg border border-gray-700">
                    <div className="flex justify-between mb-2">
                      <span className="text-indigo-400 font-medium">
                        {result.engine === "tesseract" ? "Tesseract.js" : "TrOCR"}
                      </span>
                      <span className="text-gray-400 text-sm">{result.time}s</span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-2">
                      <span className="mr-3">Preprocess: {result.preprocess}</span>
                      {result.engine === "tesseract" && (
                        <span>Language: {result.language}</span>
                      )}
                    </div>
                    
                    <div className="bg-gray-800 p-2 rounded max-h-32 overflow-y-auto">
                      <p className="text-gray-300 text-sm whitespace-pre-wrap">{result.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestOCR;