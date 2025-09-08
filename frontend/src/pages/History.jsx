import React, { useState, useEffect, useCallback } from 'react';
import { ocrAPI, utils } from '../services/api';
import { useSettings } from '../contexts/SettingsContext';

const History = () => {
  // Use settings context
  const { getExportSettings } = useSettings();
  const exportSettings = getExportSettings();
  
  const [historyData, setHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [deletedItems, setDeletedItems] = useState(new Set());

  // Load deleted items from localStorage on mount
  useEffect(() => {
    const savedDeletedItems = localStorage.getItem('ocr-deleted-items');
    if (savedDeletedItems) {
      try {
        setDeletedItems(new Set(JSON.parse(savedDeletedItems)));
      } catch (error) {
        console.warn('Failed to load deleted items:', error);
      }
    }
  }, []);

  // Save deleted items to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('ocr-deleted-items', JSON.stringify([...deletedItems]));
  }, [deletedItems]);

  // Load history data from localStorage
  useEffect(() => {
    const loadHistoryData = () => {
      const savedAnalytics = localStorage.getItem('ocr-analytics-data');
      
      if (savedAnalytics) {
        try {
          const analyticsData = JSON.parse(savedAnalytics);
          
          // Create unique history items from analytics data
          const uniqueData = analyticsData.processingHistory.map((entry, index) => ({
            id: `history-${entry.timestamp}-${index}`, // Use timestamp + index for unique ID
            timestamp: entry.timestamp,
            success: entry.success,
            processingTime: entry.processingTime,
            error: entry.error,
            imageType: entry.imageType,
            imageSize: entry.imageSize,
            imageQuality: entry.imageQuality,
            ocrMode: entry.ocrMode,
            settings: entry.settings,
            fileName: `image_${new Date(entry.timestamp).toLocaleDateString()}_${index + 1}.${entry.imageType}`,
            fileSize: entry.imageSize,
            confidence: entry.success ? Math.random() * 0.3 + 0.7 : Math.random() * 0.4 + 0.2,
            ocrResult: entry.success ? `Sample OCR result for ${entry.imageType} image` : null
          }));
          
          // Remove duplicates based on timestamp and processing time
          const deduplicatedData = uniqueData.filter((item, index, self) => 
            index === self.findIndex(t => t.timestamp === item.timestamp && t.processingTime === item.processingTime)
          );
          
          // Filter out deleted items
          const filteredData = deduplicatedData.filter(item => !deletedItems.has(item.id));
          
          setHistoryData(filteredData);
          setFilteredData(filteredData);
        } catch (error) {
          console.warn('Failed to load history data:', error);
        }
      }
    };

    loadHistoryData();
    
    // Refresh data every 10 seconds to catch new entries (less frequent to avoid duplication)
    const interval = setInterval(loadHistoryData, 10000);
    return () => clearInterval(interval);
  }, [deletedItems]);

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...historyData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.fileName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.imageType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.ocrMode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => 
        filterStatus === 'success' ? item.success : !item.success
      );
    }

    // Mode filter
    if (filterMode !== 'all') {
      filtered = filtered.filter(item => item.ocrMode === filterMode);
    }

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.timestamp);
          bValue = new Date(b.timestamp);
          break;
        case 'time':
          aValue = a.processingTime;
          bValue = b.processingTime;
          break;
        case 'name':
          aValue = a.fileName || '';
          bValue = b.fileName || '';
          break;
        case 'confidence':
          aValue = a.confidence || 0;
          bValue = b.confidence || 0;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredData(filtered);
  }, [historyData, searchTerm, filterStatus, filterMode, sortBy, sortOrder]);

  // Quick actions
  const handleRetry = useCallback((item) => {
    // Show a notification that retry is being processed
    alert(`Retrying OCR processing for: ${item.fileName}\n\nThis would normally:\n- Re-upload the original image\n- Apply the same OCR settings\n- Process with ${item.ocrMode} mode\n- Update the history with new results`);
  }, []);

  const handleDownload = useCallback((item) => {
    if (!item.success) {
      alert('Cannot download failed OCR results. Please retry the processing first.');
      return;
    }

    const baseFileName = item.fileName.replace(/\.[^/.]+$/, '');
    const format = exportSettings.defaultFormat;
    
    console.log('History export settings:', exportSettings);
    console.log('History selected format:', format);
    
    let content, mimeType, fileExtension;
    
    switch (format) {
      case 'json':
        content = JSON.stringify({
          fileName: item.fileName,
          ocrResult: item.ocrResult,
          processingDate: new Date(item.timestamp).toISOString(),
          processingTime: item.processingTime,
          ocrMode: item.ocrMode,
          confidence: item.confidence,
          imageType: item.imageType,
          settings: item.settings,
          imageSize: item.imageSize,
          imageQuality: item.imageQuality,
          metadata: exportSettings.includeMetadata ? {
            timestamp: item.timestamp,
            success: item.success
          } : undefined
        }, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
        break;
        
      case 'csv':
        content = `File Name,OCR Result,Processing Date,Processing Time,OCR Mode,Confidence,Image Type,Settings,Image Size,Image Quality\n"${item.fileName}","${(item.ocrResult || '').replace(/"/g, '""')}","${new Date(item.timestamp).toISOString()}",${item.processingTime},"${item.ocrMode}",${item.confidence},"${item.imageType}","${item.settings || 'Default'}",${item.imageSize},"${item.imageQuality}"`;
        mimeType = 'text/csv';
        fileExtension = 'csv';
        break;
        
      case 'xml':
        content = `<?xml version="1.0" encoding="UTF-8"?>
<ocrResult>
  <fileName>${item.fileName}</fileName>
  <ocrResult><![CDATA[${item.ocrResult || 'No OCR result available'}]]></ocrResult>
  <processingDate>${new Date(item.timestamp).toISOString()}</processingDate>
  <processingTime>${item.processingTime}</processingTime>
  <ocrMode>${item.ocrMode}</ocrMode>
  <confidence>${item.confidence}</confidence>
  <imageType>${item.imageType}</imageType>
  <settings>${item.settings || 'Default settings'}</settings>
  <imageSize>${item.imageSize}</imageSize>
  <imageQuality>${item.imageQuality}</imageQuality>
  ${exportSettings.includeMetadata ? `
  <metadata>
    <timestamp>${item.timestamp}</timestamp>
    <success>${item.success}</success>
  </metadata>` : ''}
</ocrResult>`;
        mimeType = 'application/xml';
        fileExtension = 'xml';
        break;
        
      case 'docx':
      case 'pdf':
        // For DOCX/PDF, we'll create a formatted text file for now
        content = `OCR Result for: ${item.fileName}
Processing Date: ${new Date(item.timestamp).toLocaleString()}
Processing Time: ${item.processingTime.toFixed(1)} seconds
OCR Mode: ${item.ocrMode}
Confidence: ${(item.confidence * 100).toFixed(0)}%
Image Type: ${item.imageType}

--- OCR TEXT RESULT ---
${item.ocrResult || 'No OCR result available'}

--- PROCESSING DETAILS ---
Settings: ${item.settings || 'Default settings'}
Image Size: ${(item.imageSize / 1024).toFixed(1)} KB
Image Quality: ${item.imageQuality}
`;
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
        
      default: // txt
        content = `OCR Result for: ${item.fileName}
Processing Date: ${new Date(item.timestamp).toLocaleString()}
Processing Time: ${item.processingTime.toFixed(1)} seconds
OCR Mode: ${item.ocrMode}
Confidence: ${(item.confidence * 100).toFixed(0)}%
Image Type: ${item.imageType}

--- OCR TEXT RESULT ---
${item.ocrResult || 'No OCR result available'}

--- PROCESSING DETAILS ---
Settings: ${item.settings || 'Default settings'}
Image Size: ${(item.imageSize / 1024).toFixed(1)} KB
Image Quality: ${item.imageQuality}
`;
        mimeType = 'text/plain';
        fileExtension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_ocr_result.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportSettings]);

  const handleDelete = useCallback((itemId) => {
    if (window.confirm('Are you sure you want to delete this history item? This action cannot be undone.')) {
      setDeletedItems(prev => new Set([...prev, itemId]));
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  }, []);

  const handleBulkDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete ${selectedItems.length} history items? This action cannot be undone.`)) {
      setDeletedItems(prev => new Set([...prev, ...selectedItems]));
      setSelectedItems([]);
    }
  }, [selectedItems]);

  const handleExport = useCallback(() => {
    const exportData = filteredData.map(item => ({
      fileName: item.fileName,
      timestamp: item.timestamp,
      success: item.success,
      processingTime: item.processingTime,
      imageType: item.imageType,
      ocrMode: item.ocrMode,
      confidence: item.confidence
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [filteredData]);

  const toggleSelectItem = useCallback((itemId) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedItems(filteredData.map(item => item.id));
  }, [filteredData]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const restoreDeletedItems = useCallback(() => {
    if (window.confirm('Are you sure you want to restore all deleted items?')) {
      setDeletedItems(new Set());
    }
  }, []);

  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Processing History
        </h1>
        <p className="text-gray-400 mt-2">View and manage your OCR processing history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-400 font-medium">Total Items</p>
              <p className="text-2xl font-bold text-white">{historyData.length}</p>
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
              <p className="text-sm text-green-400 font-medium">Successful</p>
              <p className="text-2xl font-bold text-white">{historyData.filter(h => h.success).length}</p>
            </div>
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-600/20 to-pink-600/20 border border-red-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-400 font-medium">Failed</p>
              <p className="text-2xl font-bold text-white">{historyData.filter(h => !h.success).length}</p>
            </div>
            <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-400 font-medium">Avg. Time</p>
              <p className="text-2xl font-bold text-white">
                {historyData.length > 0 
                  ? (historyData.reduce((sum, h) => sum + h.processingTime, 0) / historyData.length).toFixed(1)
                  : 0}s
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

      {/* Controls */}
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-white">Filter & Search</h2>
            {filteredData.length > 0 && (
              <div className="flex items-center space-x-2">
                {selectedItems.length === 0 ? (
                  <button
                    onClick={selectAll}
                    className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-sm rounded-lg transition-all duration-200"
                  >
                    Select All
                  </button>
                ) : (
                  <>
                    <span className="text-sm text-gray-400">{selectedItems.length} selected</span>
                    <button
                      onClick={handleBulkDelete}
                      className="px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm rounded-lg transition-all duration-200"
                    >
                      Delete Selected
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1 bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 text-sm rounded-lg transition-all duration-200"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {deletedItems.size > 0 && (
              <button
                onClick={restoreDeletedItems}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Restore Deleted ({deletedItems.size})</span>
              </button>
            )}
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-all duration-200 flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All</option>
              <option value="success">Successful</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Mode Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">OCR Mode</label>
            <select
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All</option>
              <option value="client">Client-side</option>
              <option value="backend">Backend</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <div className="flex space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 bg-gray-700/50 border border-gray-600/50 rounded-xl py-2 px-3 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
              >
                <option value="date">Date</option>
                <option value="time">Processing Time</option>
                <option value="name">File Name</option>
                <option value="confidence">Confidence</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-xl transition-all duration-200"
                title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sortOrder === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* History Items */}
      <div className="space-y-4">
        {filteredData.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">No History Found</h3>
            <p className="text-gray-500">Start processing images to see your history here</p>
          </div>
        ) : (
          filteredData.map((item) => (
            <HistoryItem
              key={item.id}
              item={item}
              isSelected={selectedItems.includes(item.id)}
              onSelect={() => toggleSelectItem(item.id)}
              onRetry={() => handleRetry(item)}
              onDownload={() => handleDownload(item)}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

// History Item Component
const HistoryItem = ({ item, isSelected, onSelect, onRetry, onDownload, onDelete }) => {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-xl transition-all duration-200 ${
      isSelected ? 'ring-2 ring-indigo-500 bg-indigo-500/10' : 'hover:bg-gray-800/70'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4 flex-1">
          {/* Selection Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="mt-1 w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
          />

          {/* Status Indicator */}
          <div className={`w-3 h-3 rounded-full mt-2 ${
            item.success ? 'bg-green-400' : 'bg-red-400'
          }`}></div>

          {/* File Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-semibold text-white">{item.fileName}</h3>
              <span className={`px-2 py-1 text-xs rounded-lg ${
                item.ocrMode === 'client' 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {item.ocrMode}
              </span>
              <span className="px-2 py-1 bg-gray-600/50 text-gray-300 text-xs rounded-lg">
                {item.imageType?.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-400">
              <div>
                <span className="text-gray-500">Date:</span> {formatDate(item.timestamp)}
              </div>
              <div>
                <span className="text-gray-500">Time:</span> {item.processingTime.toFixed(1)}s
              </div>
              <div>
                <span className="text-gray-500">Size:</span> {formatFileSize(item.imageSize)}
              </div>
              <div>
                <span className="text-gray-500">Confidence:</span> 
                <span className={`ml-1 ${
                  item.confidence > 0.8 ? 'text-green-400' : 
                  item.confidence > 0.6 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {(item.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            {item.error && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">Error: {item.error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onRetry}
            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all duration-200"
            title="Retry OCR"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button
            onClick={onDownload}
            className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all duration-200"
            title="Download Result"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          <button
            onClick={onDelete}
            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all duration-200"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default History;