/**
 * Frontend Integration Example for Hand2File Backend
 * 
 * This file shows how to integrate the backend API with your React frontend
 */

// Base API URL
const API_BASE_URL = 'http://localhost:8000/api/ocr';

/**
 * OCR Service for frontend integration
 */
class OCRService {
    /**
     * Extract text from an image file
     * @param {File} file - Image file to process
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} OCR result
     */
    static async extractText(file, options = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('ocr_type', options.ocrType || 'trocr');
            formData.append('use_preprocessing', options.usePreprocessing !== false);
            formData.append('blur_kernel', options.blurKernel || 5);
            formData.append('threshold_method', options.thresholdMethod || 'Adaptive Gaussian');
            formData.append('block_size', options.blockSize || 11);
            formData.append('c_value', options.cValue || 2);

            const response = await fetch(`${API_BASE_URL}/extract-text`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('OCR processing failed:', error);
            throw error;
        }
    }

    /**
     * Preprocess an image
     * @param {File} file - Image file to preprocess
     * @param {Object} settings - Preprocessing settings
     * @returns {Promise<Object>} Preprocessing result
     */
    static async preprocessImage(file, settings = {}) {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('blur_kernel', settings.blurKernel || 5);
            formData.append('threshold_method', settings.thresholdMethod || 'Adaptive Gaussian');
            formData.append('block_size', settings.blockSize || 11);
            formData.append('c_value', settings.cValue || 2);
            formData.append('simple_thresh_value', settings.simpleThreshValue || 127);

            const response = await fetch(`${API_BASE_URL}/preprocess`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Image preprocessing failed:', error);
            throw error;
        }
    }

    /**
     * Get status of OCR models
     * @returns {Promise<Object>} Models status
     */
    static async getModelsStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/models/status`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get models status:', error);
            throw error;
        }
    }

    /**
     * Download OCR models
     * @returns {Promise<Object>} Download result
     */
    static async downloadModels() {
        try {
            const response = await fetch(`${API_BASE_URL}/models/download`, {
                method: 'POST'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Model download failed:', error);
            throw error;
        }
    }
}

/**
 * React Hook for OCR functionality
 */
function useOCR() {
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const processImage = async (file, options = {}) => {
        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            const ocrResult = await OCRService.extractText(file, options);
            setResult(ocrResult);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const preprocessImage = async (file, settings = {}) => {
        setIsProcessing(true);
        setError(null);

        try {
            const preprocessResult = await OCRService.preprocessImage(file, settings);
            return preprocessResult;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        isProcessing,
        result,
        error,
        processImage,
        preprocessImage
    };
}

/**
 * Example React Component
 */
function OCRUploadComponent() {
    const { isProcessing, result, error, processImage } = useOCR();
    const [file, setFile] = useState(null);
    const [options, setOptions] = useState({
        ocrType: 'trocr',
        usePreprocessing: true,
        blurKernel: 5,
        thresholdMethod: 'Adaptive Gaussian'
    });

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleProcess = async () => {
        if (file) {
            await processImage(file, options);
        }
    };

    return (
        <div className="ocr-upload-component">
            <h2>OCR Text Extraction</h2>
            
            {/* File Upload */}
            <div className="file-upload">
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                />
            </div>

            {/* Processing Options */}
            <div className="processing-options">
                <label>
                    OCR Type:
                    <select
                        value={options.ocrType}
                        onChange={(e) => setOptions({...options, ocrType: e.target.value})}
                        disabled={isProcessing}
                    >
                        <option value="trocr">TrOCR (Handwritten)</option>
                        <option value="tesseract">Tesseract</option>
                    </select>
                </label>

                <label>
                    <input
                        type="checkbox"
                        checked={options.usePreprocessing}
                        onChange={(e) => setOptions({...options, usePreprocessing: e.target.checked})}
                        disabled={isProcessing}
                    />
                    Use Image Preprocessing
                </label>

                {options.usePreprocessing && (
                    <div className="preprocessing-settings">
                        <label>
                            Blur Kernel: {options.blurKernel}
                            <input
                                type="range"
                                min="1"
                                max="15"
                                step="2"
                                value={options.blurKernel}
                                onChange={(e) => setOptions({...options, blurKernel: parseInt(e.target.value)})}
                                disabled={isProcessing}
                            />
                        </label>

                        <label>
                            Threshold Method:
                            <select
                                value={options.thresholdMethod}
                                onChange={(e) => setOptions({...options, thresholdMethod: e.target.value})}
                                disabled={isProcessing}
                            >
                                <option value="Adaptive Gaussian">Adaptive Gaussian</option>
                                <option value="Adaptive Mean">Adaptive Mean</option>
                                <option value="Otsu">Otsu</option>
                                <option value="Simple">Simple</option>
                            </select>
                        </label>
                    </div>
                )}
            </div>

            {/* Process Button */}
            <button
                onClick={handleProcess}
                disabled={!file || isProcessing}
                className="process-button"
            >
                {isProcessing ? 'Processing...' : 'Extract Text'}
            </button>

            {/* Results */}
            {error && (
                <div className="error">
                    <h3>Error:</h3>
                    <p>{error}</p>
                </div>
            )}

            {result && (
                <div className="result">
                    <h3>Extracted Text:</h3>
                    <div className="text-output">
                        {result.text}
                    </div>
                    <div className="metadata">
                        <p>Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                        <p>Processing Time: {result.processing_time.toFixed(2)}s</p>
                        <p>OCR Type: {result.ocr_type}</p>
                        <p>Preprocessing Used: {result.preprocessing_used ? 'Yes' : 'No'}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Export for use in other files
export { OCRService, useOCR, OCRUploadComponent };
