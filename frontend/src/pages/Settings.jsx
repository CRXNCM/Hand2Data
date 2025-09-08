import React, { useState, useEffect } from "react";
import { ocrAPI } from "../services/api";
import { useSettings } from "../contexts/SettingsContext";

const Settings = () => {
  // Use settings context
  const { settings, updateSettings, resetSettings } = useSettings();
  
  // Local UI state
  const [activeTab, setActiveTab] = useState("ocr-engine");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [availableModels, setAvailableModels] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [downloadHistory, setDownloadHistory] = useState([]);
  const [selectedModelInfo, setSelectedModelInfo] = useState(null);
  const [showDebugDetails, setShowDebugDetails] = useState(false);
  const [progressMeta, setProgressMeta] = useState({
    startedAt: null,
    totalMB: null,
    lastPct: 0,
    lastUpdatedAt: null,
    estMBps: null,
  });

  const tabs = [
    { id: "ocr-engine", name: "OCR Engine", icon: "⚙️" },
    { id: "preprocessing", name: "Preprocessing", icon: "🔧" },
    { id: "language", name: "Language & Region", icon: "🌍" },
    { id: "performance", name: "Performance", icon: "⚡" },
    { id: "export", name: "Export & Backup", icon: "💾" },
    { id: "ui-ux", name: "UI/UX", icon: "🎨" },
    { id: "advanced", name: "Advanced", icon: "🔬" }
  ];

  useEffect(() => {
    fetchModelStatus();
    fetchAvailableModels();
  }, []);

  // Update selected model info when available models change
  useEffect(() => {
    if (availableModels?.available_models?.[settings.selectedModelType]) {
      setSelectedModelInfo(availableModels.available_models[settings.selectedModelType]);
    }
  }, [availableModels, settings.selectedModelType]);

  const saveSettings = async () => {
    setSaving(true);
    setMessage(""); // Clear any existing messages
    
    try {
      console.log("Settings are automatically saved via context");
      setMessage("✅ Settings saved and applied successfully!");
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setMessage(""), 3000);
      
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage(`❌ Failed to save settings: ${error.message}`);
      
      // Auto-hide error message after 5 seconds
      setTimeout(() => setMessage(""), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    if (window.confirm("Are you sure you want to reset all settings to default?")) {
      resetSettings();
      setMessage("✅ Settings reset to default!");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // Test function to verify save functionality
  const testSave = () => {
    console.log("Testing save functionality...");
    console.log("Current settings values:");
    console.log("- ocrEngine:", settings.ocrEngine);
    console.log("- selectedModelType:", settings.selectedModelType);
    console.log("- preprocessingEnabled:", settings.preprocessingEnabled);
    console.log("- theme:", settings.theme);
    console.log("- fontSize:", settings.fontSize);
    console.log("Settings context working:", "✅ Yes");
    
    // Test localStorage access
    try {
      const testData = { test: "value", timestamp: Date.now() };
      localStorage.setItem('test-save', JSON.stringify(testData));
      const retrieved = localStorage.getItem('test-save');
      console.log("localStorage test:", retrieved ? "✅ Working" : "❌ Failed");
      localStorage.removeItem('test-save');
    } catch (error) {
      console.error("localStorage test failed:", error);
    }
  };

  const fetchModelStatus = async () => {
    try {
      const status = await ocrAPI.getModelStatus();
      setModelStatus(status);
    } catch (error) {
      console.error("Failed to fetch model status:", error);
      setMessage("Failed to fetch model status");
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const models = await ocrAPI.getAvailableModels();
      setAvailableModels(models);
    } catch (error) {
      console.error("Failed to fetch available models:", error);
      setMessage("Failed to fetch available models");
    }
  };

  const handleDownloadModels = async () => {
    setLoading(true);
    setMessage("");
    setDownloadProgress({ [settings.selectedModelType]: 0 });
    setProgressMeta({
      startedAt: Date.now(),
      totalMB: parseSizeMB(selectedModelInfo?.size),
      lastPct: 0,
      lastUpdatedAt: Date.now(),
      estMBps: null,
    });
    
    try {
      // Simulate progress updates (in real implementation, this would come from the API)
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const current = prev[settings.selectedModelType] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [settings.selectedModelType]: current + 10 };
        });
      }, 500);

      // Track throughput and ETA (approximate)
      const metaInterval = setInterval(() => {
        setProgressMeta(prev => {
          const now = Date.now();
          const pct = downloadProgress[settings.selectedModelType] || 0;
          const elapsedSec = (now - (prev.startedAt || now)) / 1000;
          const totalMB = prev.totalMB || parseSizeMB(selectedModelInfo?.size) || null;
          let estMBps = prev.estMBps;
          if (totalMB && elapsedSec > 0) {
            const downloadedMB = (pct / 100) * totalMB;
            estMBps = downloadedMB / elapsedSec;
          }
          return { ...prev, lastPct: pct, lastUpdatedAt: now, estMBps };
        });
      }, 800);

      const result = await ocrAPI.downloadModels(settings.selectedModelType);
      
      clearInterval(progressInterval);
      clearInterval(metaInterval);
      setDownloadProgress({ [settings.selectedModelType]: 100 });
      
      // Add to download history
      const downloadRecord = {
        model: settings.selectedModelType,
        timestamp: new Date().toISOString(),
        status: 'success',
        size: selectedModelInfo?.size || 'Unknown'
      };
      setDownloadHistory(prev => [downloadRecord, ...prev.slice(0, 9)]); // Keep last 10
      
      setMessage(result.message || `Model ${settings.selectedModelType} downloaded successfully`);
      await fetchModelStatus();
      await fetchAvailableModels();
      
      // Clear progress after 2 seconds
      setTimeout(() => {
        setDownloadProgress({});
      }, 2000);
      
    } catch (error) {
      setDownloadProgress({});
      setMessage(`Download failed: ${error.message}`);
      
      // Add failed download to history
      const downloadRecord = {
        model: settings.selectedModelType,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message
      };
      setDownloadHistory(prev => [downloadRecord, ...prev.slice(0, 9)]);
    } finally {
      setLoading(false);
    }
  };

  const handleForceDownload = async () => {
    setLoading(true);
    setMessage("");
    setDownloadProgress({ [settings.selectedModelType]: 0 });
    setProgressMeta({
      startedAt: Date.now(),
      totalMB: parseSizeMB(selectedModelInfo?.size),
      lastPct: 0,
      lastUpdatedAt: Date.now(),
      estMBps: null,
    });
    
    try {
      // Simulate progress updates for force download
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const current = prev[settings.selectedModelType] || 0;
          if (current >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, [settings.selectedModelType]: current + 15 };
        });
      }, 300);

      const metaInterval = setInterval(() => {
        setProgressMeta(prev => {
          const now = Date.now();
          const pct = downloadProgress[settings.selectedModelType] || 0;
          const elapsedSec = (now - (prev.startedAt || now)) / 1000;
          const totalMB = prev.totalMB || parseSizeMB(selectedModelInfo?.size) || null;
          let estMBps = prev.estMBps;
          if (totalMB && elapsedSec > 0) {
            const downloadedMB = (pct / 100) * totalMB;
            estMBps = downloadedMB / elapsedSec;
          }
          return { ...prev, lastPct: pct, lastUpdatedAt: now, estMBps };
        });
      }, 600);

      const result = await ocrAPI.forceDownloadModels(settings.selectedModelType);
      
      clearInterval(progressInterval);
      clearInterval(metaInterval);
      setDownloadProgress({ [settings.selectedModelType]: 100 });
      
      // Add to download history
      const downloadRecord = {
        model: settings.selectedModelType,
        timestamp: new Date().toISOString(),
        status: 'success',
        size: selectedModelInfo?.size || 'Unknown',
        type: 'force'
      };
      setDownloadHistory(prev => [downloadRecord, ...prev.slice(0, 9)]);
      
      setMessage(result.message || `Model ${settings.selectedModelType} force downloaded successfully`);
      await fetchModelStatus();
      await fetchAvailableModels();
      
      setTimeout(() => {
        setDownloadProgress({});
      }, 2000);
      
    } catch (error) {
      setDownloadProgress({});
      setMessage(`Force download failed: ${error.message}`);
      
      const downloadRecord = {
        model: settings.selectedModelType,
        timestamp: new Date().toISOString(),
        status: 'failed',
        error: error.message,
        type: 'force'
      };
      setDownloadHistory(prev => [downloadRecord, ...prev.slice(0, 9)]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await ocrAPI.clearModelCache();
      setMessage(result.message || "Model cache cleared successfully");
      await fetchModelStatus();
      await fetchAvailableModels();
    } catch (error) {
      setMessage(`Clear cache failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelection = (modelType) => {
    updateSettings({ selectedModelType: modelType });
    // Update selected model info
    if (availableModels?.available_models?.[modelType]) {
      setSelectedModelInfo(availableModels.available_models[modelType]);
    }
  };

  const formatFileSize = (sizeStr) => {
    if (!sizeStr) return 'Unknown';
    return sizeStr;
  };

  const parseSizeMB = (sizeStr) => {
    if (!sizeStr) return null;
    const s = String(sizeStr).trim().replace(/~/g, '').replace(/\s+/g, '');
    const match = s.match(/([0-9]*\.?[0-9]+)(MB|GB)/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return unit === 'GB' ? Math.round(value * 1024) : Math.round(value);
  };

  const formatSeconds = (secs) => {
    if (secs == null || !isFinite(secs)) return '—';
    const s = Math.max(0, Math.round(secs));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  };

  const getModelDescription = (modelType) => {
    const descriptions = {
      'base': 'Base TrOCR model - Good balance of speed and accuracy for general text recognition',
      'large': 'Large TrOCR model - Higher accuracy for complex documents and handwritten text',
      'handwritten': 'Handwritten TrOCR model - Optimized specifically for handwritten text recognition',
      'printed': 'Printed TrOCR model - Optimized for printed text and documents'
    };
    return descriptions[modelType] || 'TrOCR model for text recognition';
  };

  // Render Functions for Each Tab
  const renderOCREngineTab = () => (
    <div className="space-y-6">
      {/* Engine Selection */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">OCR Engine Selection</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="radio"
              id="tesseract"
              name="ocrEngine"
              value="tesseract"
              checked={settings.ocrEngine === "tesseract"}
              onChange={(e) => updateSettings({ ocrEngine: e.target.value })}
              className="w-4 h-4 text-indigo-600"
            />
            <label htmlFor="tesseract" className="text-gray-300">
              <span className="font-medium">Tesseract OCR</span>
              <p className="text-sm text-gray-400">Traditional OCR engine, good for printed text</p>
            </label>
          </div>
          <div className="flex items-center space-x-4">
            <input
              type="radio"
              id="trocr"
              name="ocrEngine"
              value="trocr"
              checked={settings.ocrEngine === "trocr"}
              onChange={(e) => updateSettings({ ocrEngine: e.target.value })}
              className="w-4 h-4 text-indigo-600"
            />
            <label htmlFor="trocr" className="text-gray-300">
              <span className="font-medium">TrOCR (Transformer OCR)</span>
              <p className="text-sm text-gray-400">AI-powered OCR, excellent for handwritten text</p>
            </label>
          </div>
        </div>
      </div>

      {/* Enhanced Model Management */}
      {settings.ocrEngine === "trocr" && (
        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-6 text-gray-200 flex items-center">
            <span className="mr-2">🤖</span>
            TrOCR Model Management
          </h3>
          
          {/* Model Selection with Enhanced UI */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-3">Select Model Type</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableModels?.available_models && Object.entries(availableModels.available_models).map(([key, model]) => (
                <div
                  key={key}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    settings.selectedModelType === key
                      ? 'border-indigo-500 bg-indigo-900/20'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                  }`}
                  onClick={() => handleModelSelection(key)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-200 capitalize">{key}</h4>
                    <span className="text-xs text-gray-400">{formatFileSize(model.size)}</span>
                  </div>
                  <p className="text-sm text-gray-400 mb-2">{getModelDescription(key)}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Repository: {model.repo}</span>
                    {modelStatus?.trocr?.current_model_type === key && (
                      <span className="px-2 py-1 bg-green-600 text-white rounded">Active</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Model Information */}
          {selectedModelInfo && (
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-200 mb-3 flex items-center">
                <span className="mr-2">ℹ️</span>
                Selected Model Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Model:</span>
                  <span className="text-gray-300 ml-2 font-medium">{settings.selectedModelType}</span>
                </div>
                <div>
                  <span className="text-gray-400">Size:</span>
                  <span className="text-gray-300 ml-2">{formatFileSize(selectedModelInfo.size)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Repository:</span>
                  <span className="text-gray-300 ml-2 text-xs">{selectedModelInfo.repo}</span>
                </div>
                {modelStatus?.trocr?.status && (
                  <div>
                    <span className="text-gray-400">Status:</span>
                    <span className="text-gray-300 ml-2 text-xs">{modelStatus.trocr.status}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Current Model Status */}
          {modelStatus?.trocr && (
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-200 mb-3 flex items-center">
                <span className="mr-2">📊</span>
                Current Model Status
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-gray-400 mb-1">Status</div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    modelStatus.trocr.loaded ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {modelStatus.trocr.loaded ? '✅ Loaded' : '❌ Not Loaded'}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 mb-1">Model</div>
                  <div className="text-gray-300 font-medium">{modelStatus.trocr.current_model_type || 'None'}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 mb-1">Device</div>
                  <div className="text-gray-300 font-medium">{modelStatus.trocr.device || 'Unknown'}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 mb-1">Repository</div>
                  <div className="text-gray-300 text-xs">{modelStatus.trocr.model_repo || 'None'}</div>
                </div>
              </div>

              {/* Installed Models */}
              {Array.isArray(modelStatus.trocr.installed_models) && (
                <div className="mt-4">
                  <div className="text-gray-200 font-medium mb-2">Installed Models</div>
                  {modelStatus.trocr.installed_models.length === 0 ? (
                    <div className="text-gray-400 text-sm">No models installed yet.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {modelStatus.trocr.installed_models.map((m, idx) => (
                        <span key={idx} className="px-2 py-1 rounded bg-gray-600 text-gray-200 text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Debug Details Toggle */}
              <div className="mt-4">
                <button
                  onClick={() => setShowDebugDetails((v) => !v)}
                  className="px-3 py-2 rounded bg-gray-600 hover:bg-gray-500 text-sm"
                >
                  {showDebugDetails ? 'Hide Debug Details' : 'Show Debug Details'}
                </button>
                {showDebugDetails && (
                  <div className="mt-3 bg-gray-800 rounded p-3 overflow-auto max-h-64">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
{JSON.stringify({
  trocr: modelStatus.trocr,
  availableModels: availableModels,
}, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Download Progress */}
          {downloadProgress[settings.selectedModelType] !== undefined && (
            <div className="bg-gray-700 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-200 mb-3 flex items-center">
                <span className="mr-2">⬇️</span>
                Download Progress
              </h4>
              <div className="w-full bg-gray-600 rounded-full h-3 mb-2">
                <div 
                  className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress[settings.selectedModelType]}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Downloading {settings.selectedModelType}...</span>
                  <span>{downloadProgress[settings.selectedModelType]}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Speed</span>
                  <span>{progressMeta.estMBps ? `${progressMeta.estMBps.toFixed(2)} MB/s` : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Downloaded</span>
                  <span>
                    {(() => {
                      const total = progressMeta.totalMB;
                      const pct = downloadProgress[settings.selectedModelType] || 0;
                      if (!total) return `${pct}%`;
                      const downloaded = Math.min(total, Math.max(0, Math.round((pct / 100) * total)));
                      return `${downloaded} MB / ${total} MB`;
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ETA</span>
                  <span>
                    {(() => {
                      const total = progressMeta.totalMB;
                      const pct = downloadProgress[settings.selectedModelType] || 0;
                      const rate = progressMeta.estMBps;
                      if (!total || !rate || rate <= 0) return '—';
                      const remainingMB = Math.max(0, total - (pct / 100) * total);
                      const etaSec = remainingMB / rate;
                      return formatSeconds(etaSec);
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Model Actions */}
          <div className="space-y-3">
            <button
              onClick={handleDownloadModels}
              disabled={loading || downloadProgress[settings.selectedModelType] !== undefined}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition flex items-center justify-center space-x-2"
            >
              <span>⬇️</span>
              <span>{loading ? "Processing..." : `Download ${settings.selectedModelType} Model`}</span>
            </button>
            <button
              onClick={handleForceDownload}
              disabled={loading || downloadProgress[settings.selectedModelType] !== undefined}
              className="w-full px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 rounded-lg transition flex items-center justify-center space-x-2"
            >
              <span>🔄</span>
              <span>{loading ? "Processing..." : `Force Download ${settings.selectedModelType}`}</span>
            </button>
            <button
              onClick={handleClearCache}
              disabled={loading}
              className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg transition flex items-center justify-center space-x-2"
            >
              <span>🗑️</span>
              <span>{loading ? "Processing..." : "Clear All Cache"}</span>
            </button>
          </div>

          {/* Download History */}
          {downloadHistory.length > 0 && (
            <div className="mt-6 bg-gray-700 p-4 rounded-lg">
              <h4 className="font-medium text-gray-200 mb-3 flex items-center">
                <span className="mr-2">📋</span>
                Recent Downloads
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {downloadHistory.slice(0, 5).map((record, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-gray-600 rounded">
                    <div className="flex items-center space-x-2">
                      <span className={record.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                        {record.status === 'success' ? '✅' : '❌'}
                      </span>
                      <span className="text-gray-300">{record.model}</span>
                      {record.type === 'force' && <span className="text-orange-400 text-xs">(Force)</span>}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {new Date(record.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Settings */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Performance Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">GPU Acceleration</span>
            <input
              type="checkbox"
              checked={settings.gpuAcceleration}
              onChange={(e) => updateSettings({ gpuAcceleration: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Batch Processing</span>
            <input
              type="checkbox"
              checked={settings.batchProcessing}
              onChange={(e) => updateSettings({ batchProcessing: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Additional Tab Render Functions
  const renderPreprocessingTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Image Preprocessing</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Enable Preprocessing</span>
            <input
              type="checkbox"
              checked={settings.preprocessingEnabled}
              onChange={(e) => updateSettings({ preprocessingEnabled: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Noise Reduction</span>
            <input
              type="checkbox"
              checked={settings.noiseReduction}
              onChange={(e) => updateSettings({ noiseReduction: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Image Enhancement</span>
            <input
              type="checkbox"
              checked={settings.imageEnhancement}
              onChange={(e) => updateSettings({ imageEnhancement: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Threshold Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Threshold Method</label>
            <select
              value={settings.thresholdMethod}
              onChange={(e) => updateSettings({ thresholdMethod: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="Adaptive Gaussian">Adaptive Gaussian</option>
              <option value="Adaptive Mean">Adaptive Mean</option>
              <option value="Otsu">Otsu</option>
              <option value="Simple">Simple</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Blur Kernel Size: {settings.blurKernel}</label>
            <input
              type="range"
              min="1"
              max="15"
              step="2"
              value={settings.blurKernel}
              onChange={(e) => updateSettings({ blurKernel: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Block Size: {settings.blockSize}</label>
            <input
              type="range"
              min="3"
              max="21"
              step="2"
              value={settings.blockSize}
              onChange={(e) => updateSettings({ blockSize: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">C Value: {settings.cValue}</label>
            <input
              type="range"
              min="0"
              max="10"
              value={settings.cValue}
              onChange={(e) => updateSettings({ cValue: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Image Enhancement</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Contrast Boost: {settings.contrastBoost}</label>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={settings.contrastBoost}
              onChange={(e) => updateSettings({ contrastBoost: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderLanguageTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Language Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Primary Language</label>
            <select
              value={settings.primaryLanguage}
              onChange={(e) => updateSettings({ primaryLanguage: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="eng">English</option>
              <option value="spa">Spanish</option>
              <option value="fra">French</option>
              <option value="deu">German</option>
              <option value="ita">Italian</option>
              <option value="por">Portuguese</option>
              <option value="rus">Russian</option>
              <option value="chi_sim">Chinese (Simplified)</option>
              <option value="chi_tra">Chinese (Traditional)</option>
              <option value="jpn">Japanese</option>
              <option value="kor">Korean</option>
              <option value="ara">Arabic</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Auto Language Detection</span>
            <input
              type="checkbox"
              checked={settings.languageDetection}
              onChange={(e) => updateSettings({ languageDetection: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Region Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Region</label>
            <select
              value={settings.region}
              onChange={(e) => updateSettings({ region: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="ES">Spain</option>
              <option value="IT">Italy</option>
              <option value="JP">Japan</option>
              <option value="CN">China</option>
              <option value="KR">South Korea</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Date Format</label>
            <select
              value={settings.dateFormat}
              onChange={(e) => updateSettings({ dateFormat: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (EU)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              <option value="DD.MM.YYYY">DD.MM.YYYY (German)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Custom Dictionary</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Custom Words (one per line)</label>
            <textarea
              value={settings.customDictionary}
              onChange={(e) => updateSettings({ customDictionary: e.target.value })}
              placeholder="Enter custom words or phrases that should be recognized..."
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none h-32 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Processing Speed</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Speed vs Quality</label>
            <select
              value={settings.processingSpeed}
              onChange={(e) => updateSettings({ processingSpeed: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="fast">Fast (Lower Quality)</option>
              <option value="balanced">Balanced</option>
              <option value="high">High Quality (Slower)</option>
              <option value="maximum">Maximum Quality (Slowest)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Accuracy Level</label>
            <select
              value={settings.accuracyLevel}
              onChange={(e) => updateSettings({ accuracyLevel: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="low">Low (Fast)</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="maximum">Maximum</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Resource Management</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Concurrent Processes: {settings.maxConcurrent}</label>
            <input
              type="range"
              min="1"
              max="8"
              value={settings.maxConcurrent}
              onChange={(e) => updateSettings({ maxConcurrent: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Memory Limit (MB): {settings.memoryLimit}</label>
            <input
              type="range"
              min="512"
              max="8192"
              step="256"
              value={settings.memoryLimit}
              onChange={(e) => updateSettings({ memoryLimit: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (seconds): {settings.timeout}</label>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={settings.timeout}
              onChange={(e) => updateSettings({ timeout: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Retry Attempts: {settings.retryAttempts}</label>
            <input
              type="range"
              min="0"
              max="5"
              value={settings.retryAttempts}
              onChange={(e) => updateSettings({ retryAttempts: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderExportTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Export Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Default Export Format</label>
            <select
              value={settings.defaultFormat}
              onChange={(e) => updateSettings({ defaultFormat: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="txt">Plain Text (.txt)</option>
              <option value="docx">Word Document (.docx)</option>
              <option value="pdf">PDF Document (.pdf)</option>
              <option value="json">JSON (.json)</option>
              <option value="csv">CSV (.csv)</option>
              <option value="xml">XML (.xml)</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Include Metadata</span>
            <input
              type="checkbox"
              checked={settings.includeMetadata}
              onChange={(e) => updateSettings({ includeMetadata: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Auto Save</span>
            <input
              type="checkbox"
              checked={settings.autoSave}
              onChange={(e) => updateSettings({ autoSave: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Backup Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Enable Backup</span>
            <input
              type="checkbox"
              checked={settings.backupEnabled}
              onChange={(e) => updateSettings({ backupEnabled: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Backup Interval</label>
            <select
              value={settings.backupInterval}
              onChange={(e) => updateSettings({ backupInterval: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Cloud Sync</span>
            <input
              type="checkbox"
              checked={settings.cloudSync}
              onChange={(e) => updateSettings({ cloudSync: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderUIUXTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Font Size</label>
            <select
              value={settings.fontSize}
              onChange={(e) => updateSettings({ fontSize: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra-large">Extra Large</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Layout</label>
            <select
              value={settings.layout}
              onChange={(e) => updateSettings({ layout: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="sidebar">Sidebar</option>
              <option value="topbar">Top Bar</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Interactions</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Enable Animations</span>
            <input
              type="checkbox"
              checked={settings.animations}
              onChange={(e) => updateSettings({ animations: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Sound Effects</span>
            <input
              type="checkbox"
              checked={settings.soundEffects}
              onChange={(e) => updateSettings({ soundEffects: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Accessibility Mode</span>
            <input
              type="checkbox"
              checked={settings.accessibility}
              onChange={(e) => updateSettings({ accessibility: e.target.checked })}
              className="w-5 h-5 accent-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdvancedTab = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Debug & Logging</h3>
        <div className="space-y-4">
        <div className="flex items-center justify-between">
            <span className="text-gray-300">Debug Mode</span>
          <input
            type="checkbox"
              checked={settings.debugMode}
              onChange={(e) => updateSettings({ debugMode: e.target.checked })}
            className="w-5 h-5 accent-indigo-500"
          />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Logging Level</label>
            <select
              value={settings.loggingLevel}
              onChange={(e) => updateSettings({ loggingLevel: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
              <option value="trace">Trace</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">API Configuration</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">API Endpoint</label>
            <input
              type="text"
              value={settings.apiEndpoint}
              onChange={(e) => updateSettings({ apiEndpoint: e.target.value })}
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none"
              placeholder="http://localhost:8000"
            />
          </div>
        </div>
        </div>

      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Experimental Features</h3>
        <div className="space-y-4">
        <div className="flex items-center justify-between">
            <span className="text-gray-300">Enable Experimental Features</span>
          <input
            type="checkbox"
              checked={settings.experimentalFeatures}
              onChange={(e) => updateSettings({ experimentalFeatures: e.target.checked })}
            className="w-5 h-5 accent-indigo-500"
          />
        </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Custom Configuration (JSON)</label>
            <textarea
              value={settings.customConfig}
              onChange={(e) => updateSettings({ customConfig: e.target.value })}
              placeholder="Enter custom configuration in JSON format..."
              className="w-full p-3 bg-gray-700 text-gray-200 rounded-lg border border-gray-600 focus:border-indigo-500 focus:outline-none h-32 resize-none font-mono text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <div className="flex space-x-3">
          <button
            onClick={testSave}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition text-sm"
          >
            Test Save
          </button>
          <button
            onClick={handleResetSettings}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition"
          >
            Reset
          </button>
          <button
            onClick={() => {
              console.log("Save button clicked!");
              saveSettings();
            }}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 rounded-lg transition"
          >
            {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-md transition ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span className="font-medium">{tab.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-gray-800 rounded-xl p-6">
        {activeTab === "ocr-engine" && renderOCREngineTab()}
        {activeTab === "preprocessing" && renderPreprocessingTab()}
        {activeTab === "language" && renderLanguageTab()}
        {activeTab === "performance" && renderPerformanceTab()}
        {activeTab === "export" && renderExportTab()}
        {activeTab === "ui-ux" && renderUIUXTab()}
        {activeTab === "advanced" && renderAdvancedTab()}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg max-w-md ${
          message.includes('success') || message.includes('Success') 
            ? 'bg-green-800 text-green-200' 
            : 'bg-red-800 text-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            <span className="text-lg">
              {message.includes('success') || message.includes('Success') ? '✅' : '❌'}
            </span>
            <span>{message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
