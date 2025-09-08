// API service for OCR and preprocessing endpoints

const API_BASE_URL = 'http://127.0.0.1:8000/api';

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Don't set Content-Type for FormData - let the browser set it with boundary
  const defaultOptions = {};
  
  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers = {
      'Content-Type': 'application/json',
    };
  }

  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { detail: `HTTP error! status: ${response.status}` };
    }
    
    console.error('API Error:', {
      status: response.status,
      statusText: response.statusText,
      errorData: errorData
    });
    
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  return response.json();
};

// OCR API functions
export const ocrAPI = {
  // Extract text from image
  extractText: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('ocr_type', options.ocrType || 'tesseract');
    formData.append('model_type', options.modelType || 'large-handwritten');
    formData.append('use_preprocessing', options.usePreprocessing || true);
    formData.append('blur_kernel', options.blurKernel || 5);
    formData.append('threshold_method', options.thresholdMethod || 'Adaptive Gaussian');
    formData.append('block_size', options.blockSize || 11);
    formData.append('c_value', options.cValue || 2);

    return apiCall('/ocr/extract-text', {
      method: 'POST',
      body: formData,
    });
  },

  // Preprocess image
  preprocessImage: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('blur_kernel', options.blurKernel || 5);
    formData.append('threshold_method', options.thresholdMethod || 'Adaptive Gaussian');
    formData.append('block_size', options.blockSize || 11);
    formData.append('c_value', options.cValue || 2);
    formData.append('simple_thresh_value', options.simpleThreshValue || 127);

    // Debug logging
    console.log('Sending FormData with parameters:', {
      blurKernel: options.blurKernel || 5,
      thresholdMethod: options.thresholdMethod || 'Adaptive Gaussian',
      blockSize: options.blockSize || 11,
      cValue: options.cValue || 2,
      simpleThreshValue: options.simpleThreshValue || 127
    });
    console.log('File:', file.name, file.type, file.size);

    return apiCall('/ocr/preprocess', {
      method: 'POST',
      body: formData,
    });
  },

  // Get model status
  getModelStatus: async () => {
    return apiCall('/ocr/models/status');
  },

  // Get available models
  getAvailableModels: async () => {
    return apiCall('/ocr/models/available');
  },

  // Download models
  downloadModels: async (modelType = 'large-handwritten') => {
    return apiCall(`/ocr/models/download?model_type=${modelType}`, {
      method: 'POST',
    });
  },

  // Force download models (even if cached)
  forceDownloadModels: async (modelType = 'large-handwritten') => {
    return apiCall(`/ocr/models/force-download?model_type=${modelType}`, {
      method: 'POST',
    });
  },

  // Clear model cache
  clearModelCache: async () => {
    return apiCall('/ocr/models/cache', {
      method: 'DELETE',
    });
  },
};

// Utility functions
export const utils = {
  // Validate image file
  validateImageFile: (file) => {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/bmp',
      'image/webp',
    ];
    return validTypes.includes(file.type);
  },

  // Create object URL for file preview
  createFilePreview: (file) => {
    return URL.createObjectURL(file);
  },

  // Download file from base64 data URL
  downloadFile: (dataUrl, filename) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // Format processing time
  formatTime: (timeInSeconds) => {
    return parseFloat(timeInSeconds).toFixed(2);
  },
};

export default {
  ocrAPI,
  utils,
};
