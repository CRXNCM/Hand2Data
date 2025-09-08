import React, { useState, useEffect } from "react";
import Tesseract from "tesseract.js";
import { ocrAPI, utils } from "../services/api";
import { useSettings } from "../contexts/SettingsContext";
import { memoryManager } from "../utils/memoryManager";

const OCRResultPanel = ({ file, isProcessing, setIsProcessing, ocrMode, backendSettings, modelStatus, exportSettings, onProcessingComplete }) => {
  // Use settings context
  const { getOCRSettings, getPreprocessingSettings, getPerformanceSettings } = useSettings();
  
  const [ocrText, setOcrText] = useState("");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentStep, setCurrentStep] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [retryAttempts, setRetryAttempts] = useState(0);
  const [processingTime, setProcessingTime] = useState(0);
  const [confidence, setConfidence] = useState(null);
  
  // Get settings from context
  const ocrSettings = getOCRSettings();
  const preprocessingSettings = getPreprocessingSettings();
  const performanceSettings = getPerformanceSettings();

  useEffect(() => {
    setErrorMessage("");
    setProgress(0);
    setOcrText("");
    setCurrentStep("");
    setProcessingTime(0);
    setConfidence(null);

    if (!file) return;

    if (!utils.validateImageFile(file)) {
      setErrorMessage(`Unsupported file type: ${file.type}. Upload a valid image.`);
      return;
    }

    setIsProcessing(true);

    const processImage = async () => {
      const startTime = performance.now();
      let success = false;
      let error = null;
      
      try {
        if (ocrMode === "backend" && modelStatus) {
          // Backend processing
          setCurrentStep("Processing with backend...");
          setProgress(20);
          
          const result = await ocrAPI.extractText(file, {
            ocrType: ocrSettings.ocrType,
            modelType: ocrSettings.modelType,
            usePreprocessing: preprocessingSettings.enabled,
            blurKernel: preprocessingSettings.blurKernel,
            thresholdMethod: preprocessingSettings.thresholdMethod,
            blockSize: preprocessingSettings.blockSize,
            cValue: preprocessingSettings.cValue,
            primaryLanguage: ocrSettings.primaryLanguage,
            languageDetection: ocrSettings.languageDetection,
            customDictionary: ocrSettings.customDictionary,
            processingSpeed: performanceSettings.processingSpeed,
            accuracyLevel: performanceSettings.accuracyLevel,
          });

          setProgress(100);
          setOcrText(result.text);
          setConfidence(result.confidence);
          setProcessingTime(utils.formatTime((performance.now() - startTime) / 1000));
          success = true;
          
        } else {
          // Check if we should use backend due to memory constraints
          if (memoryManager.shouldUseBackend()) {
            console.log("Memory constraints detected, using backend processing");
            setCurrentStep("Memory constraints detected, using backend...");
            setProgress(20);
            
            try {
              const result = await ocrAPI.extractText(file, {
                ocrType: "tesseract",
                modelType: "default",
                usePreprocessing: preprocessingSettings.enabled,
                blurKernel: preprocessingSettings.blurKernel,
                thresholdMethod: preprocessingSettings.thresholdMethod,
                blockSize: preprocessingSettings.blockSize,
                cValue: preprocessingSettings.cValue,
                primaryLanguage: ocrSettings.primaryLanguage,
                languageDetection: ocrSettings.languageDetection,
                customDictionary: ocrSettings.customDictionary,
                processingSpeed: performanceSettings.processingSpeed,
                accuracyLevel: performanceSettings.accuracyLevel,
              });

              setProgress(100);
              setOcrText(result.text);
              setConfidence(result.confidence);
              success = true;
              setProcessingTime(utils.formatTime((performance.now() - startTime) / 1000));
              return;
            } catch (backendError) {
              console.error("Backend processing failed:", backendError);
              setErrorMessage(`Backend processing failed: ${backendError.message}`);
              error = backendError.message;
              setProcessingTime(utils.formatTime((performance.now() - startTime) / 1000));
              return;
            }
          }

          // Client-side processing with memory management
          setCurrentStep("Initializing Tesseract...");
          setProgress(10);
          
          // Check if we should use backend due to memory constraints
          if (memoryManager.shouldUseBackend()) {
            console.log("Memory constraints detected, using backend processing");
            setCurrentStep("Memory constraints detected, using backend...");
            setProgress(20);
            
            try {
              const result = await ocrAPI.extractText(file, {
                ocrType: "tesseract",
                modelType: "default",
                usePreprocessing: preprocessingSettings.enabled,
                blurKernel: preprocessingSettings.blurKernel,
                thresholdMethod: preprocessingSettings.thresholdMethod,
                blockSize: preprocessingSettings.blockSize,
                cValue: preprocessingSettings.cValue,
                primaryLanguage: ocrSettings.primaryLanguage,
                languageDetection: ocrSettings.languageDetection,
                customDictionary: ocrSettings.customDictionary,
                processingSpeed: performanceSettings.processingSpeed,
                accuracyLevel: performanceSettings.accuracyLevel,
              });

              setProgress(100);
              setOcrText(result.text);
              setConfidence(result.confidence);
              success = true;
              setProcessingTime(utils.formatTime((performance.now() - startTime) / 1000));
              return;
            } catch (backendError) {
              console.error("Backend processing failed:", backendError);
              setErrorMessage(`Backend processing failed: ${backendError.message}`);
              error = backendError.message;
              setProcessingTime(utils.formatTime((performance.now() - startTime) / 1000));
              return;
            }
          }
          
          try {
            // Use Tesseract.js v6 API directly
            setCurrentStep("Processing image with Tesseract...");
            setProgress(30);
            
            const language = ocrSettings.primaryLanguage || "eng";
            console.log("Starting OCR recognition with file:", file, "language:", language);
            
            const { data } = await Tesseract.recognize(file, language);
            console.log("OCR recognition completed, data:", data);
            
            setProgress(90);
            setCurrentStep("Finalizing results...");

          if (data.text) {
            setOcrText(data.text);
            setConfidence(data.confidence || 0.95);
            success = true;
            
            // Show fallback notification if TrOCR failed and Tesseract was used
            if (data.fallback_used) {
              console.warn("TrOCR failed, used Tesseract fallback:", data.fallback_reason);
              setCurrentStep(`TrOCR unavailable, used Tesseract fallback`);
            }
          } else {
            setErrorMessage("No text detected. Try a clearer image.");
            error = "No text detected";
          }
            
          } catch (wasmError) {
            console.warn("Client-side Tesseract failed, falling back to backend:", wasmError);
            
            // Fallback to backend processing
            setCurrentStep("Client-side failed, switching to backend...");
            setProgress(30);
            
            try {
              const result = await ocrAPI.extractText(file, {
                ocrType: "tesseract", // Force tesseract on backend
                modelType: "default",
                usePreprocessing: preprocessingSettings.enabled,
                blurKernel: preprocessingSettings.blurKernel,
                thresholdMethod: preprocessingSettings.thresholdMethod,
                blockSize: preprocessingSettings.blockSize,
                cValue: preprocessingSettings.cValue,
                primaryLanguage: ocrSettings.primaryLanguage,
                languageDetection: ocrSettings.languageDetection,
                customDictionary: ocrSettings.customDictionary,
                processingSpeed: performanceSettings.processingSpeed,
                accuracyLevel: performanceSettings.accuracyLevel,
              });

              setProgress(100);
              setOcrText(result.text);
              setConfidence(result.confidence);
              success = true;
              
            } catch (backendError) {
              console.error("Backend fallback also failed:", backendError);
              setErrorMessage(`OCR failed: ${wasmError.message}. Backend also unavailable.`);
              error = wasmError.message;
            }
          }
          
          setProcessingTime(utils.formatTime((performance.now() - startTime) / 1000));
        }
      } catch (err) {
        console.error("OCR processing error:", err);
        error = err.message;
        setErrorMessage(
          err.name === "DataCloneError"
            ? "DataCloneError: Browser limitation with Web Workers. Try a simpler image or different browser."
            : `Error processing image: ${err.message || "Unknown error"}`
        );
      } finally {
        setIsProcessing(false);
        
        // Update statistics
        const processingTime = (performance.now() - startTime) / 1000;
        if (onProcessingComplete) {
          onProcessingComplete(success, processingTime, error);
        }
      }
    };

    processImage();
  }, [file, retryCount, setIsProcessing, ocrMode, backendSettings, modelStatus, ocrSettings.primaryLanguage, preprocessingSettings.enabled, performanceSettings.processingSpeed]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Cleanup any active workers when component unmounts
      memoryManager.cleanupAll();
    };
  }, []);

  // Handle export with different formats
  const handleExport = () => {
    const baseFileName = file?.name?.split('.')[0] || 'ocr';
    const format = exportSettings.defaultFormat;
    
    console.log('Export settings:', exportSettings);
    console.log('Selected format:', format);
    
    let content, mimeType, fileExtension;
    
    switch (format) {
      case 'json':
        content = JSON.stringify({
          text: ocrText,
          confidence: confidence,
          processingTime: processingTime,
          timestamp: new Date().toISOString(),
          fileName: file?.name,
          metadata: exportSettings.includeMetadata ? {
            ocrEngine: ocrMode === "backend" ? "Backend" : "Client-side",
            language: ocrSettings.primaryLanguage,
            preprocessing: preprocessingSettings.enabled
          } : undefined
        }, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
        
      case 'csv':
        content = `Text,Confidence,Processing Time,Timestamp\n"${ocrText.replace(/"/g, '""')}",${confidence || 'N/A'},${processingTime},${new Date().toISOString()}`;
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
        
      case 'xml':
        content = `<?xml version="1.0" encoding="UTF-8"?>
<ocrResult>
  <text><![CDATA[${ocrText}]]></text>
  <confidence>${confidence || 'N/A'}</confidence>
  <processingTime>${processingTime}</processingTime>
  <timestamp>${new Date().toISOString()}</timestamp>
  <fileName>${file?.name || 'unknown'}</fileName>
  ${exportSettings.includeMetadata ? `
  <metadata>
    <ocrEngine>${ocrMode === "backend" ? "Backend" : "Client-side"}</ocrEngine>
    <language>${ocrSettings.primaryLanguage}</language>
    <preprocessing>${preprocessingSettings.enabled}</preprocessing>
  </metadata>` : ''}
</ocrResult>`;
        mimeType = 'application/xml';
        fileExtension = 'xml';
        break;
        
      case 'docx':
        // For DOCX, we'll create a simple text file for now
        // In a real implementation, you'd use a library like docx
        content = `OCR Result\n\n${ocrText}\n\nProcessing Time: ${processingTime}\nConfidence: ${confidence || 'N/A'}\nTimestamp: ${new Date().toLocaleString()}`;
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
        
      case 'pdf':
        // For PDF, we'll create a simple text file for now
        // In a real implementation, you'd use a library like jsPDF
        content = `OCR Result\n\n${ocrText}\n\nProcessing Time: ${processingTime}\nConfidence: ${confidence || 'N/A'}\nTimestamp: ${new Date().toLocaleString()}`;
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
        
      default: // txt
        content = ocrText;
        mimeType = 'text/plain';
        fileExtension = 'txt';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_result.${fileExtension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-md">
      <h2 className="text-lg font-semibold mb-4">OCR Results</h2>

      {isProcessing ? (
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
      ) : errorMessage ? (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-700 rounded-lg">
          <p className="text-red-400">{errorMessage}</p>
          <div className="mt-3 flex space-x-3">
            <button
              onClick={() => setRetryCount((prev) => prev + 1)}
              className="px-3 py-1 bg-indigo-700 hover:bg-indigo-600 rounded text-sm"
            >
              Retry
            </button>
            <button
              onClick={() => setErrorMessage("")}
              className="px-3 py-1 bg-red-800 hover:bg-red-700 rounded text-sm"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : ocrText ? (
        <div className="mt-4">
          {/* Processing Info */}
          <div className="mb-4 p-3 bg-gray-700 rounded-lg">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-4">
                <span className="text-gray-300">
                  Mode: <span className="text-indigo-400">{ocrMode === "backend" ? "Backend" : "Client-side"}</span>
                </span>
                <span className="text-gray-300">
                  Time: <span className="text-green-400">{processingTime}s</span>
                </span>
                {confidence && (
                  <span className="text-gray-300">
                    Confidence: <span className={`${confidence > 0.8 ? 'text-green-400' : confidence > 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {Math.round(confidence * 100)}%
                    </span>
                  </span>
                )}
              </div>
              {ocrMode === "backend" && backendSettings && (
                <span className="text-xs text-gray-400">
                  {backendSettings.ocrEngine} • {backendSettings.language}
                </span>
              )}
            </div>
            {currentStep.includes("fallback") && (
              <div className="mt-2 p-2 bg-yellow-900/30 border border-yellow-700 rounded text-xs text-yellow-300">
                ⚠️ TrOCR model unavailable, using Tesseract fallback
              </div>
            )}
          </div>
          
          {/* OCR Text */}
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 max-h-80 overflow-y-auto">
            <pre className="text-gray-300 whitespace-pre-wrap font-mono text-sm">{ocrText}</pre>
          </div>
          
          {/* Actions */}
          <div className="mt-4 flex justify-between">
            <div className="flex space-x-2">
              <button
                onClick={() => navigator.clipboard.writeText(ocrText)}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-sm"
              >
                Download {exportSettings.defaultFormat.toUpperCase()}
              </button>
            </div>
            <button
              onClick={() => setRetryCount((prev) => prev + 1)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Retry OCR
            </button>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 italic">
          {file
            ? "Ready to process. The OCR results will appear here."
            : "No OCR results yet. Upload an image file."}
        </div>
      )}
    </div>
  );
};

export default OCRResultPanel;
