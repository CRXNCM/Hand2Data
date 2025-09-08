import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  // Default settings
  const defaultSettings = {
    // OCR Engine Configuration
    ocrEngine: "tesseract",
    selectedModelType: "large-handwritten",
    gpuAcceleration: true,
    batchProcessing: false,

    // Preprocessing Settings
    preprocessingEnabled: true,
    blurKernel: 5,
    thresholdMethod: "Adaptive Gaussian",
    blockSize: 11,
    cValue: 2,
    noiseReduction: true,
    imageEnhancement: true,
    contrastBoost: 1.2,

    // Language and Region Settings
    primaryLanguage: "eng",
    secondaryLanguages: [],
    languageDetection: true,
    customDictionary: "",
    region: "US",
    dateFormat: "MM/DD/YYYY",

    // Performance and Quality Settings
    processingSpeed: "balanced",
    accuracyLevel: "high",
    maxConcurrent: 2,
    memoryLimit: 2048,
    timeout: 30,
    retryAttempts: 3,

    // Export and Backup Settings
    defaultFormat: "txt",
    includeMetadata: true,
    autoSave: true,
    backupEnabled: true,
    backupInterval: "daily",
    cloudSync: false,

    // UI/UX Settings
    theme: "dark",
    fontSize: "medium",
    layout: "sidebar",
    animations: true,
    soundEffects: false,
    accessibility: false,

    // Advanced Settings
    debugMode: false,
    loggingLevel: "info",
    apiEndpoint: "http://localhost:8000",
    experimentalFeatures: false,
    customConfig: ""
  };

  const [settings, setSettings] = useState(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = localStorage.getItem('ocr-settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings(prevSettings => ({
            ...prevSettings,
            ...parsedSettings
          }));
        }
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setIsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save settings to localStorage
  const updateSettings = (newSettings) => {
    const updatedSettings = {
      ...settings,
      ...newSettings
    };
    setSettings(updatedSettings);
    
    try {
      localStorage.setItem('ocr-settings', JSON.stringify(updatedSettings));
      console.log('Settings updated and saved:', updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  // Reset settings to default
  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('ocr-settings');
  };

  // Get OCR settings for API calls
  const getOCRSettings = useCallback(() => ({
    ocrType: settings.ocrEngine,
    modelType: settings.selectedModelType,
    usePreprocessing: settings.preprocessingEnabled,
    blurKernel: settings.blurKernel,
    thresholdMethod: settings.thresholdMethod,
    blockSize: settings.blockSize,
    cValue: settings.cValue,
    primaryLanguage: settings.primaryLanguage,
    languageDetection: settings.languageDetection,
    customDictionary: settings.customDictionary,
    processingSpeed: settings.processingSpeed,
    accuracyLevel: settings.accuracyLevel
  }), [settings]);

  // Get preprocessing settings
  const getPreprocessingSettings = useCallback(() => ({
    enabled: settings.preprocessingEnabled,
    blurKernel: settings.blurKernel,
    thresholdMethod: settings.thresholdMethod,
    blockSize: settings.blockSize,
    cValue: settings.cValue,
    noiseReduction: settings.noiseReduction,
    imageEnhancement: settings.imageEnhancement,
    contrastBoost: settings.contrastBoost
  }), [settings]);

  // Get UI settings
  const getUISettings = useCallback(() => ({
    theme: settings.theme,
    fontSize: settings.fontSize,
    layout: settings.layout,
    animations: settings.animations,
    soundEffects: settings.soundEffects,
    accessibility: settings.accessibility
  }), [settings]);

  // Get performance settings
  const getPerformanceSettings = useCallback(() => ({
    processingSpeed: settings.processingSpeed,
    accuracyLevel: settings.accuracyLevel,
    maxConcurrent: settings.maxConcurrent,
    memoryLimit: settings.memoryLimit,
    timeout: settings.timeout,
    retryAttempts: settings.retryAttempts,
    gpuAcceleration: settings.gpuAcceleration,
    batchProcessing: settings.batchProcessing
  }), [settings]);

  // Get export settings
  const getExportSettings = useCallback(() => ({
    defaultFormat: settings.defaultFormat,
    includeMetadata: settings.includeMetadata,
    autoSave: settings.autoSave,
    backupEnabled: settings.backupEnabled,
    backupInterval: settings.backupInterval,
    cloudSync: settings.cloudSync
  }), [settings]);

  const value = {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
    getOCRSettings,
    getPreprocessingSettings,
    getUISettings,
    getPerformanceSettings,
    getExportSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
