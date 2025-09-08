import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import UploadArea from "../components/UploadArea";
import OCRResultPanel from "../components/OCRResultPanel";
import { ocrAPI, utils } from "../services/api";
import PreprocessingOptimizer from "../services/preprocessingOptimizer";
import eventBus from "../utils/eventBus";
import { useSettings } from "../contexts/SettingsContext";
import { memoryManager } from "../utils/memoryManager";

const Dashboard = () => {
  // Use settings context
  const { getOCRSettings, getPreprocessingSettings, getPerformanceSettings, getExportSettings, updateSettings } = useSettings();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [ocrMode, setOcrMode] = useState(() => {
    const saved = localStorage.getItem('dashboard-ocr-mode');
    return saved || "client";
  });
  
  // Get settings from context (memoized to prevent re-renders)
  const ocrSettings = useMemo(() => getOCRSettings(), [getOCRSettings]);
  const preprocessingSettings = useMemo(() => getPreprocessingSettings(), [getPreprocessingSettings]);
  const performanceSettings = useMemo(() => getPerformanceSettings(), [getPerformanceSettings]);
  const exportSettings = useMemo(() => getExportSettings(), [getExportSettings]);
  const [modelStatus, setModelStatus] = useState(null);
  const [optimizer] = useState(() => new PreprocessingOptimizer());
  const [autoOptimization, setAutoOptimization] = useState(() => {
    const saved = localStorage.getItem('dashboard-auto-optimization');
    return saved ? JSON.parse(saved) : true;
  });
  const [memoryInfo, setMemoryInfo] = useState(null);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    averageTime: 0,
    successRate: 0,
    totalTime: 0,
    successfulProcesses: 0,
    failedProcesses: 0
  });
  const [recentFiles, setRecentFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    processingHistory: [],
    performanceMetrics: {
      byImageType: {},
      byImageSize: {},
      byImageQuality: {},
      bySettings: {}
    },
    speedComparison: {
      client: [],
      backend: []
    }
  });
  const dashboardRef = useRef(null);
  
  // Load stats from localStorage on mount
  useEffect(() => {
    const savedStats = localStorage.getItem('ocr-processing-stats');
    if (savedStats) {
      try {
        const parsedStats = JSON.parse(savedStats);
        setProcessingStats(parsedStats);
      } catch (error) {
        console.warn('Failed to parse saved stats:', error);
      }
    }
  }, []);
  
  // Save stats to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ocr-processing-stats', JSON.stringify(processingStats));
  }, [processingStats]);
  
  // Function to update processing statistics
  const updateProcessingStats = useCallback((success, processingTime, error = null, file = null, ocrMode = null, settings = null) => {
    setProcessingStats(prev => {
      const newStats = {
        ...prev,
        totalProcessed: prev.totalProcessed + 1,
        totalTime: prev.totalTime + processingTime,
        successfulProcesses: success ? prev.successfulProcesses + 1 : prev.successfulProcesses,
        failedProcesses: !success ? prev.failedProcesses + 1 : prev.failedProcesses
      };
      
      // Calculate derived stats
      newStats.averageTime = newStats.totalProcessed > 0 ? newStats.totalTime / newStats.totalProcessed : 0;
      newStats.successRate = newStats.totalProcessed > 0 ? (newStats.successfulProcesses / newStats.totalProcessed) * 100 : 0;
      
      // Emit event for sidebar updates (defer to avoid render phase issues)
      setTimeout(() => {
        eventBus.emit('processingComplete', {
          success,
          processingTime,
          file,
          ocrMode,
          stats: newStats
        });
      }, 0);
      
      return newStats;
    });
    
    // Update analytics data
    if (file && ocrMode) {
      updateAnalyticsData(success, processingTime, error, file, ocrMode, settings);
    }
  }, []);
  
  // Function to update analytics data
  const updateAnalyticsData = useCallback((success, processingTime, error, file, ocrMode, settings) => {
    const timestamp = new Date().toISOString();
    const imageType = file?.type?.split('/')[1] || 'unknown';
    const imageSize = file?.size || 0;
    const imageQuality = imageSize > 1000000 ? 'high' : imageSize > 100000 ? 'medium' : 'low';
    
    setAnalyticsData(prev => {
      const newData = { ...prev };
      
      // Add to processing history
      newData.processingHistory.push({
        timestamp,
        success,
        processingTime,
        error,
        imageType,
        imageSize,
        imageQuality,
        ocrMode,
        settings: settings ? JSON.stringify(settings) : null
      });
      
      // Keep only last 100 entries
      if (newData.processingHistory.length > 100) {
        newData.processingHistory = newData.processingHistory.slice(-100);
      }
      
      // Update performance metrics
      if (!newData.performanceMetrics.byImageType[imageType]) {
        newData.performanceMetrics.byImageType[imageType] = { total: 0, successful: 0, totalTime: 0 };
      }
      newData.performanceMetrics.byImageType[imageType].total++;
      if (success) newData.performanceMetrics.byImageType[imageType].successful++;
      newData.performanceMetrics.byImageType[imageType].totalTime += processingTime;
      
      if (!newData.performanceMetrics.byImageSize[imageQuality]) {
        newData.performanceMetrics.byImageSize[imageQuality] = { total: 0, successful: 0, totalTime: 0 };
      }
      newData.performanceMetrics.byImageSize[imageQuality].total++;
      if (success) newData.performanceMetrics.byImageSize[imageQuality].successful++;
      newData.performanceMetrics.byImageSize[imageQuality].totalTime += processingTime;
      
      // Update speed comparison
      if (ocrMode === 'client') {
        newData.speedComparison.client.push({ timestamp, processingTime, success });
      } else {
        newData.speedComparison.backend.push({ timestamp, processingTime, success });
      }
      
      // Keep only last 50 entries for speed comparison
      if (newData.speedComparison.client.length > 50) {
        newData.speedComparison.client = newData.speedComparison.client.slice(-50);
      }
      if (newData.speedComparison.backend.length > 50) {
        newData.speedComparison.backend = newData.speedComparison.backend.slice(-50);
      }
      
      return newData;
    });
  }, []);
  
  // Function to add file to recent files
  const addToRecentFiles = useCallback((file) => {
    const fileInfo = {
      id: Date.now(),
      name: file.name,
      size: file.size,
      type: file.type,
      timestamp: new Date().toISOString(),
      url: URL.createObjectURL(file)
    };
    
    setRecentFiles(prev => {
      const updated = [fileInfo, ...prev.filter(f => f.id !== fileInfo.id)].slice(0, 10); // Keep only 10 recent files
      localStorage.setItem('recent-files', JSON.stringify(updated));
      return updated;
    });
  }, []);
  
  // Load recent files from localStorage on mount
  useEffect(() => {
    const savedRecentFiles = localStorage.getItem('recent-files');
    if (savedRecentFiles) {
      try {
        const parsedFiles = JSON.parse(savedRecentFiles);
        setRecentFiles(parsedFiles);
      } catch (error) {
        console.warn('Failed to parse saved recent files:', error);
      }
    }
  }, []);
  
  // Load analytics data from localStorage on mount
  useEffect(() => {
    const savedAnalytics = localStorage.getItem('ocr-analytics-data');
    if (savedAnalytics) {
      try {
        const parsedAnalytics = JSON.parse(savedAnalytics);
        setAnalyticsData(parsedAnalytics);
      } catch (error) {
        console.warn('Failed to parse saved analytics:', error);
      }
    }
  }, []);
  
  // Save analytics data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ocr-analytics-data', JSON.stringify(analyticsData));
  }, [analyticsData]);

  // Save Dashboard settings to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard-ocr-mode', ocrMode);
  }, [ocrMode]);

  // Settings are now managed by the context, no need for local storage

  useEffect(() => {
    localStorage.setItem('dashboard-auto-optimization', JSON.stringify(autoOptimization));
  }, [autoOptimization]);

  // Monitor memory usage
  useEffect(() => {
    const updateMemoryInfo = () => {
      const info = memoryManager.getMemoryInfo();
      setMemoryInfo(info);
    };
    
    updateMemoryInfo();
    const memoryInterval = setInterval(updateMemoryInfo, 5000); // Update every 5 seconds
    
    return () => clearInterval(memoryInterval);
  }, []);
  
  // Function to reset statistics
  const resetStatistics = useCallback(() => {
    setProcessingStats({
      totalProcessed: 0,
      averageTime: 0,
      successRate: 0,
      totalTime: 0,
      successfulProcesses: 0,
      failedProcesses: 0
    });
  }, []);
  
  // Check backend status on component mount
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const status = await ocrAPI.getModelStatus();
        setModelStatus(status);
      } catch (error) {
        console.warn("Backend not available:", error.message);
        setModelStatus(null);
      }
    };
    checkBackendStatus();
  }, []);
  
  const handleFileSelect = useCallback(async (file) => {
    // Reset processing state when a new file is selected
    setIsProcessing(false);
    setSelectedFile(file);
    setOptimizationResult(null);
    
    // Add to recent files
    addToRecentFiles(file);
    
    // Auto-optimize preprocessing settings if enabled and backend is available
    if (autoOptimization && ocrMode === "backend" && modelStatus) {
      try {
        setIsProcessing(true);
        const result = await optimizer.findOptimalSettings(file, ocrAPI);
        setOptimizationResult(result);
        
        // Update backend settings with optimized values
        setBackendSettings(prev => ({
          ...prev,
          preprocessingSettings: result.optimalSettings
        }));
        
        setIsProcessing(false);
      } catch (error) {
        console.warn("Auto-optimization failed:", error);
        setIsProcessing(false);
      }
    }
  }, [autoOptimization, ocrMode, modelStatus, optimizer, addToRecentFiles]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'o':
            e.preventDefault();
            document.getElementById('file-upload')?.click();
            break;
          case 'r':
            e.preventDefault();
            if (selectedFile) {
              // Trigger retry
              setSelectedFile(null);
              setTimeout(() => setSelectedFile(selectedFile), 100);
            }
            break;
          case 's':
            e.preventDefault();
            setShowAdvancedSettings(!showAdvancedSettings);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedFile, showAdvancedSettings]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      {/* Main Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          OCR Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Advanced OCR processing with intelligent preprocessing</p>
      </div>

      {/* OCR Mode Selection */}
      <div className="mb-8">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Processing Mode</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client-side Mode */}
            <label className={`relative cursor-pointer transition-all duration-200 ${
              ocrMode === "client" ? 'ring-2 ring-indigo-500' : ''
            }`}>
              <input
                type="radio"
                name="ocrMode"
                value="client"
                checked={ocrMode === "client"}
                onChange={(e) => setOcrMode(e.target.value)}
                className="sr-only"
              />
              <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                ocrMode === "client" 
                  ? 'bg-indigo-600/20 border-indigo-500' 
                  : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ocrMode === "client" ? 'bg-indigo-500' : 'bg-gray-600'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Client-side</h3>
                    <p className="text-sm text-gray-400">Fast browser processing</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">Fast</span>
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">Offline</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
            
            {/* Backend Mode */}
            <label className={`relative cursor-pointer transition-all duration-200 ${
              ocrMode === "backend" ? 'ring-2 ring-purple-500' : ''
            } ${!modelStatus ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="radio"
                name="ocrMode"
                value="backend"
                checked={ocrMode === "backend"}
                onChange={(e) => setOcrMode(e.target.value)}
                className="sr-only"
                disabled={!modelStatus}
              />
              <div className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                ocrMode === "backend" 
                  ? 'bg-purple-600/20 border-purple-500' 
                  : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
              }`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    ocrMode === "backend" ? 'bg-purple-500' : 'bg-gray-600'
                  }`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Backend</h3>
                    <p className="text-sm text-gray-400">Advanced server processing</p>
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">Advanced</span>
                      <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">Preprocessing</span>
                    </div>
                  </div>
                </div>
              </div>
            </label>
          </div>
          
          {/* Backend Status */}
          {modelStatus && (
            <div className="mt-6 p-4 bg-gray-700/30 rounded-xl">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Backend Status</h3>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${modelStatus.tesseract?.loaded ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-300">Tesseract</span>
                  <span className="text-xs text-gray-500">{modelStatus.tesseract?.status || 'Unknown'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${modelStatus.trocr?.loaded ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span className="text-sm text-gray-300">TrOCR</span>
                  <span className="text-xs text-gray-500">{modelStatus.trocr?.status || 'Unknown'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Backend Settings Panel - Collapsible */}
        {ocrMode === "backend" && modelStatus && (
          <div className="mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Advanced Settings</h2>
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 flex items-center space-x-2"
                >
                  <span>{showAdvancedSettings ? 'Hide' : 'Show'} Settings</span>
                  <svg 
                    className={`w-4 h-4 transition-transform duration-200 ${showAdvancedSettings ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Backend Status */}
              <div className="mb-6 p-4 bg-gray-700/50 rounded-xl">
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${modelStatus.tesseract?.loaded ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-gray-300 font-medium">Tesseract</span>
                    <span className="text-gray-500">{modelStatus.tesseract?.status || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${modelStatus.trocr?.loaded ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className="text-gray-300 font-medium">TrOCR</span>
                    <span className="text-gray-500">{modelStatus.trocr?.status || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Collapsible Settings */}
              <div className={`transition-all duration-300 overflow-hidden ${
                showAdvancedSettings ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* OCR Engine */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      OCR Engine
                    </label>
                    <select
                      value={ocrSettings.ocrType}
                      onChange={(e) => updateSettings({ ocrEngine: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl py-3 px-4 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="tesseract">Tesseract OCR</option>
                      <option value="trocr" disabled={!modelStatus.trocr?.loaded}>
                        TrOCR {!modelStatus.trocr?.loaded && '(Not Available)'}
                      </option>
                    </select>
                  </div>
                  
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">
                      Language
                    </label>
                    <select
                      value={ocrSettings.primaryLanguage}
                      onChange={(e) => updateSettings({ primaryLanguage: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl py-3 px-4 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="eng">English</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="spa">Spanish</option>
                      <option value="chi_sim">Chinese (Simplified)</option>
                    </select>
                  </div>
                </div>
                
                {/* Preprocessing Options */}
                <div className="mt-6 space-y-4">
                  {/* Preprocessing Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                    <div>
                      <h3 className="text-sm font-medium text-gray-300">Image Preprocessing</h3>
                      <p className="text-xs text-gray-500">Enhance image quality before OCR</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preprocessingSettings.enabled}
                        onChange={(e) => updateSettings({ preprocessingEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                  
                  {/* Auto-Optimization Toggle */}
                  {preprocessingSettings.enabled && (
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl">
                      <div>
                        <h3 className="text-sm font-medium text-gray-300">Auto-Optimization</h3>
                        <p className="text-xs text-gray-500">Automatically find best settings for each image</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoOptimization}
                          onChange={(e) => setAutoOptimization(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  )}
                  
                  {/* Settings Display */}
                  {preprocessingSettings.enabled && (
                    <div className="p-4 bg-gray-700/30 rounded-xl">
                      <h4 className="text-sm font-medium text-gray-300 mb-3">Current Settings</h4>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Blur Kernel:</span>
                          <span className="text-gray-300">{preprocessingSettings.blurKernel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Method:</span>
                          <span className="text-gray-300">{preprocessingSettings.thresholdMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Block Size:</span>
                          <span className="text-gray-300">{preprocessingSettings.blockSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">C Value:</span>
                          <span className="text-gray-300">{preprocessingSettings.cValue}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">
                        {autoOptimization 
                          ? "✨ Settings will be automatically optimized for each image"
                          : "🔧 For advanced preprocessing, use the 'Preprocess OCR' page"
                        }
                      </p>
                    </div>
                  )}
                  
                  {/* Optimization Results */}
                  {optimizationResult && (
                    <div className="p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-400">Auto-Optimized</span>
                        <span className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded">
                          {Math.round(optimizationResult.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">
                        {optimizationResult.reasoning}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>Type: {optimizationResult.analysis.type}</span>
                        <span>•</span>
                        <span>Quality: {optimizationResult.analysis.quality}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Main Content Area */}
      <div 
        ref={dashboardRef}
        className={`relative transition-all duration-300 ${
          isDragOver ? 'scale-105' : 'scale-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-sm rounded-2xl border-2 border-dashed border-indigo-400 z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-indigo-400">Drop your image here</p>
              <p className="text-sm text-gray-300">Release to upload and process</p>
            </div>
          </div>
        )}

        {/* Quick Actions Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Ctrl+O</span>
              <span>•</span>
              <span>Ctrl+R</span>
              <span>•</span>
              <span>Ctrl+S</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Quick Upload Button */}
            <button
              onClick={() => document.getElementById('file-upload')?.click()}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>Upload Image</span>
            </button>
            
            {/* Recent Files Dropdown */}
            {recentFiles.length > 0 && (
              <div className="relative">
                <button className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200 flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Recent</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Processing Statistics</h2>
            {processingStats.totalProcessed > 0 && (
              <button
                onClick={resetStatistics}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset Stats</span>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-400 font-medium">Total Processed</p>
                  <p className="text-2xl font-bold text-white">{processingStats.totalProcessed}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {processingStats.successfulProcesses} successful, {processingStats.failedProcesses} failed
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400 font-medium">Success Rate</p>
                  <p className="text-2xl font-bold text-white">{Math.round(processingStats.successRate)}%</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {processingStats.totalProcessed > 0 ? 'Based on recent processing' : 'No data yet'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
        <div>
                  <p className="text-sm text-purple-400 font-medium">Avg. Time</p>
                  <p className="text-2xl font-bold text-white">{processingStats.averageTime.toFixed(1)}s</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Total: {processingStats.totalTime.toFixed(1)}s
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Processing Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">Upload & Process</h2>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>Ctrl+O</span>
                  <span>to upload</span>
                </div>
              </div>
              
          <UploadArea onFileSelect={handleFileSelect} />
          
              <div className="mt-6 p-4 bg-gray-700/30 rounded-xl">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Supported Formats</h3>
                <div className="flex flex-wrap gap-2">
                  {['PNG', 'JPG', 'JPEG', 'BMP', 'TIFF', 'WEBP'].map((format) => (
                    <span key={format} className="px-3 py-1 bg-gray-600/50 text-gray-300 text-xs rounded-lg">
                      {format}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  💡 For best results, ensure your text is clear and well-lit
                </p>
              </div>
            </div>
          </div>
          
          {/* Results Section */}
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">OCR Results</h2>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>Ctrl+R</span>
                  <span>to retry</span>
          </div>
        </div>

        {/* Memory Status */}
        {memoryInfo && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Memory Status</h2>
            <div className="bg-gradient-to-br from-orange-600/20 to-red-600/20 border border-orange-500/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-400 font-medium">Memory Usage</p>
                  <p className="text-2xl font-bold text-white">{memoryInfo.usage}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round(memoryInfo.used / 1024 / 1024)}MB / {Math.round(memoryInfo.limit / 1024 / 1024)}MB
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Memory Usage</span>
                  <span>{memoryInfo.usage}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      parseFloat(memoryInfo.usage) > 80 ? 'bg-red-500' : 
                      parseFloat(memoryInfo.usage) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: memoryInfo.usage }}
                  ></div>
                </div>
                {parseFloat(memoryInfo.usage) > 70 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ High memory usage detected. Backend processing recommended.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
          <OCRResultPanel 
            file={selectedFile} 
            isProcessing={isProcessing} 
            setIsProcessing={setIsProcessing} 
                ocrMode={ocrMode}
                backendSettings={ocrSettings}
                modelStatus={modelStatus}
                exportSettings={exportSettings}
                onProcessingComplete={(success, processingTime, error) => 
                  updateProcessingStats(success, processingTime, error, selectedFile, ocrMode, ocrSettings)
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section */}
      <div className="mt-12">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Advanced Analytics</h2>
              <p className="text-sm text-gray-400 mt-1">Processing trends, performance metrics, and insights</p>
            </div>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <span>{showAnalytics ? 'Hide' : 'Show'} Analytics</span>
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${showAnalytics ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Collapsible Analytics Content */}
          <div className={`transition-all duration-300 overflow-hidden ${
            showAnalytics ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}>
            
            {/* Processing Trends */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Processing Trends</h3>
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {analyticsData.processingHistory.length}
                    </div>
                    <div className="text-sm text-gray-400">Total Sessions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {analyticsData.processingHistory.filter(h => h.success).length}
                    </div>
                    <div className="text-sm text-gray-400">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {analyticsData.processingHistory.length > 0 
                        ? (analyticsData.processingHistory.reduce((sum, h) => sum + h.processingTime, 0) / analyticsData.processingHistory.length).toFixed(1)
                        : 0}s
                    </div>
                    <div className="text-sm text-gray-400">Avg. Time</div>
                  </div>
                </div>
                
                {/* Recent Activity */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Recent Activity</h4>
                  {analyticsData.processingHistory.slice(-5).reverse().map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-600/30 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${entry.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className="text-sm text-gray-300">{entry.imageType.toUpperCase()}</span>
                        <span className="text-xs text-gray-500">{entry.ocrMode}</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        {entry.processingTime.toFixed(1)}s
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* By Image Type */}
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">By Image Type</h4>
                  <div className="space-y-2">
                    {Object.entries(analyticsData.performanceMetrics.byImageType).map(([type, data]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">{type.toUpperCase()}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{data.successful}/{data.total}</span>
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-green-400 h-2 rounded-full" 
                              style={{ width: `${(data.successful / data.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {data.total > 0 ? ((data.successful / data.total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Image Quality */}
                <div className="bg-gray-700/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">By Image Quality</h4>
                  <div className="space-y-2">
                    {Object.entries(analyticsData.performanceMetrics.byImageSize).map(([quality, data]) => (
                      <div key={quality} className="flex items-center justify-between">
                        <span className="text-sm text-gray-400 capitalize">{quality}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">{data.successful}/{data.total}</span>
                          <div className="w-16 bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-blue-400 h-2 rounded-full" 
                              style={{ width: `${(data.successful / data.total) * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-400">
                            {data.total > 0 ? ((data.successful / data.total) * 100).toFixed(0) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Success Rate Analysis */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Success Rate Analysis</h3>
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Best Performing Settings */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Best Performing Settings</h4>
                    <div className="space-y-2">
                      {analyticsData.processingHistory
                        .filter(h => h.success)
                        .reduce((acc, entry) => {
                          const settings = entry.settings ? JSON.parse(entry.settings) : {};
                          const key = `${entry.ocrMode}-${settings.thresholdMethod || 'default'}`;
                          if (!acc[key]) {
                            acc[key] = { count: 0, totalTime: 0, settings };
                          }
                          acc[key].count++;
                          acc[key].totalTime += entry.processingTime;
                          return acc;
                        }, {})
                        ? Object.entries(
                            analyticsData.processingHistory
                              .filter(h => h.success)
                              .reduce((acc, entry) => {
                                const settings = entry.settings ? JSON.parse(entry.settings) : {};
                                const key = `${entry.ocrMode}-${settings.thresholdMethod || 'default'}`;
                                if (!acc[key]) {
                                  acc[key] = { count: 0, totalTime: 0, settings };
                                }
                                acc[key].count++;
                                acc[key].totalTime += entry.processingTime;
                                return acc;
                              }, {})
                          )
                          .sort((a, b) => b[1].count - a[1].count)
                          .slice(0, 3)
                          .map(([key, data]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-gray-600/30 rounded-lg">
                              <div>
                                <div className="text-sm text-gray-300">{key}</div>
                                <div className="text-xs text-gray-500">{data.count} successful</div>
                              </div>
                              <div className="text-xs text-gray-400">
                                {(data.totalTime / data.count).toFixed(1)}s avg
                              </div>
                            </div>
                          ))
                        : <div className="text-sm text-gray-500">No data available</div>
                      }
                    </div>
                  </div>

                  {/* Processing Insights */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Insights</h4>
                    <div className="space-y-2 text-sm text-gray-400">
                      {analyticsData.processingHistory.length > 0 && (
                        <>
                          <div className="p-2 bg-gray-600/30 rounded-lg">
                            <span className="text-green-400">✓</span> Most successful: {
                              Object.entries(analyticsData.performanceMetrics.byImageType)
                                .sort((a, b) => (b[1].successful / b[1].total) - (a[1].successful / a[1].total))[0]?.[0] || 'N/A'
                            } images
                          </div>
                          <div className="p-2 bg-gray-600/30 rounded-lg">
                            <span className="text-blue-400">⚡</span> Fastest processing: {
                              analyticsData.speedComparison.client.length > 0 && analyticsData.speedComparison.backend.length > 0
                                ? analyticsData.speedComparison.client.reduce((sum, c) => sum + c.processingTime, 0) / analyticsData.speedComparison.client.length <
                                  analyticsData.speedComparison.backend.reduce((sum, b) => sum + b.processingTime, 0) / analyticsData.speedComparison.backend.length
                                  ? 'Client-side' : 'Backend'
                                : 'N/A'
                            }
                          </div>
                          <div className="p-2 bg-gray-600/30 rounded-lg">
                            <span className="text-purple-400">📊</span> Total processing time: {
                              (analyticsData.processingHistory.reduce((sum, h) => sum + h.processingTime, 0) / 60).toFixed(1)
                            } minutes
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Processing Speed Comparison */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Processing Speed Comparison</h3>
              <div className="bg-gray-700/30 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Client-side Performance */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Client-side Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Average Time:</span>
                        <span className="text-sm text-blue-400">
                          {analyticsData.speedComparison.client.length > 0 
                            ? (analyticsData.speedComparison.client.reduce((sum, c) => sum + c.processingTime, 0) / analyticsData.speedComparison.client.length).toFixed(1)
                            : 0}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Success Rate:</span>
                        <span className="text-sm text-green-400">
                          {analyticsData.speedComparison.client.length > 0 
                            ? ((analyticsData.speedComparison.client.filter(c => c.success).length / analyticsData.speedComparison.client.length) * 100).toFixed(0)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Total Sessions:</span>
                        <span className="text-sm text-gray-300">{analyticsData.speedComparison.client.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Backend Performance */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-300 mb-3">Backend Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Average Time:</span>
                        <span className="text-sm text-purple-400">
                          {analyticsData.speedComparison.backend.length > 0 
                            ? (analyticsData.speedComparison.backend.reduce((sum, b) => sum + b.processingTime, 0) / analyticsData.speedComparison.backend.length).toFixed(1)
                            : 0}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Success Rate:</span>
                        <span className="text-sm text-green-400">
                          {analyticsData.speedComparison.backend.length > 0 
                            ? ((analyticsData.speedComparison.backend.filter(b => b.success).length / analyticsData.speedComparison.backend.length) * 100).toFixed(0)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-400">Total Sessions:</span>
                        <span className="text-sm text-gray-300">{analyticsData.speedComparison.backend.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Speed Comparison Chart */}
                {analyticsData.speedComparison.client.length > 0 && analyticsData.speedComparison.backend.length > 0 && (
                  <div className="mt-4 p-3 bg-gray-600/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Speed Comparison</span>
                      <span className="text-xs text-gray-500">Last 10 sessions</span>
                    </div>
                    <div className="flex items-end space-x-1 h-16">
                      {[...Array(10)].map((_, i) => {
                        const clientTime = analyticsData.speedComparison.client.slice(-10)[i]?.processingTime || 0;
                        const backendTime = analyticsData.speedComparison.backend.slice(-10)[i]?.processingTime || 0;
                        const maxTime = Math.max(...analyticsData.speedComparison.client.slice(-10).map(c => c.processingTime), 
                                               ...analyticsData.speedComparison.backend.slice(-10).map(b => b.processingTime));
                        
                        return (
                          <div key={i} className="flex flex-col items-center space-y-1 flex-1">
                            <div className="flex flex-col space-y-1 w-full">
                              <div 
                                className="bg-blue-400 rounded-sm" 
                                style={{ height: `${(clientTime / maxTime) * 40}px` }}
                                title={`Client: ${clientTime.toFixed(1)}s`}
                              ></div>
                              <div 
                                className="bg-purple-400 rounded-sm" 
                                style={{ height: `${(backendTime / maxTime) * 40}px` }}
                                title={`Backend: ${backendTime.toFixed(1)}s`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>Client-side</span>
                      <span>Backend</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reset Analytics Button */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setAnalyticsData({
                    processingHistory: [],
                    performanceMetrics: { byImageType: {}, byImageSize: {}, byImageQuality: {}, bySettings: {} },
                    speedComparison: { client: [], backend: [] }
                  });
                }}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-all duration-200"
              >
                Reset Analytics Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
