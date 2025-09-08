import React, { useState, useCallback } from "react";

const UploadArea = ({ onFileSelect }) => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const validateFile = (selectedFile) => {
    setError('');
    
    if (!selectedFile) return false;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Please select a valid image file (PNG, JPG, JPEG)');
      return false;
    }
    
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (selectedFile.size > maxSize) {
      setError(`File is too large. Maximum size is 5MB. Current size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB`);
      return false;
    }
    
    return true;
  };
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      if (onFileSelect) {
        onFileSelect(selectedFile);
      }
    } else {
      // Reset file input
      e.target.value = '';
    }
  };
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        if (onFileSelect) {
          onFileSelect(droppedFile);
        }
      }
    }
  }, [onFileSelect]);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <div 
      className={`border-2 border-dashed ${isDragging ? 'border-indigo-500' : 'border-gray-700'} rounded-xl p-6 text-center bg-gray-800 hover:border-indigo-500 transition-colors`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {error && (
        <div className="mb-4 p-2 bg-red-900/30 border border-red-700 rounded text-sm text-red-400">
          {error}
          <button 
            onClick={() => setError('')} 
            className="ml-2 text-red-300 hover:text-red-100"
          >
            ✕
          </button>
        </div>
      )}
      
      <label
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center justify-center"
      >
        <svg
          className="w-12 h-12 text-gray-400 mb-3"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0l-4 4m4-4l4 4"
          />
        </svg>
        <p className="text-gray-400">
          Drag & drop your file here, or{" "}
          <span className="text-indigo-400">browse</span>
        </p>
        <input
          id="file-upload"
          type="file"
          accept=".png,.jpg,.jpeg"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
      {file && (
        <div className="mt-4">
          <p className="text-sm text-gray-300">
            Selected file: <span className="font-medium">{file.name}</span>
          </p>
          {file.type.startsWith('image/') && (
            <div className="mt-3 max-w-xs mx-auto">
              <img 
                src={URL.createObjectURL(file)} 
                alt="Preview" 
                className="max-h-40 rounded border border-gray-700" 
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadArea;
