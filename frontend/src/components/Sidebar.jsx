import React, { useState, useEffect, useCallback } from 'react';
import eventBus from '../utils/eventBus';

export default function Sidebar({ activePage, setActivePage }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [processingStats, setProcessingStats] = useState({
    totalProcessed: 0,
    successRate: 0,
    averageTime: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Load data from localStorage
  const loadData = useCallback(() => {
    // Load history count
    const savedAnalytics = localStorage.getItem('ocr-analytics-data');
    const savedDeletedItems = localStorage.getItem('ocr-deleted-items');
    
    if (savedAnalytics) {
      try {
        const analyticsData = JSON.parse(savedAnalytics);
        const deletedItems = savedDeletedItems ? new Set(JSON.parse(savedDeletedItems)) : new Set();
        
        // Create unique history items with proper IDs (same logic as History page)
        const uniqueData = analyticsData.processingHistory.map((entry, index) => ({
          id: `history-${entry.timestamp}-${index}`,
          timestamp: entry.timestamp,
          success: entry.success,
          processingTime: entry.processingTime,
          imageType: entry.imageType,
          ocrMode: entry.ocrMode
        }));
        
        // Remove duplicates based on timestamp and processing time
        const deduplicatedData = uniqueData.filter((item, index, self) => 
          index === self.findIndex(t => t.timestamp === item.timestamp && t.processingTime === item.processingTime)
        );
        
        // Filter out deleted items
        const filteredData = deduplicatedData.filter(item => !deletedItems.has(item.id));
        
        // Set history count
        setHistoryCount(filteredData.length);
        
        // Calculate processing stats using deduplicated data
        const successful = deduplicatedData.filter(item => item.success).length;
        const totalTime = deduplicatedData.reduce((sum, item) => sum + item.processingTime, 0);
        
        setProcessingStats({
          totalProcessed: deduplicatedData.length,
          successRate: deduplicatedData.length > 0 ? (successful / deduplicatedData.length) * 100 : 0,
          averageTime: deduplicatedData.length > 0 ? totalTime / deduplicatedData.length : 0
        });
        
        // Get last 3 items and format for display
        const recent = filteredData
          .slice(-3)
          .reverse()
          .map(item => ({
            id: item.id,
            fileName: `image_${new Date(item.timestamp).toLocaleDateString()}_${item.id.split('-').pop()}.${item.imageType}`,
            timestamp: item.timestamp,
            success: item.success,
            ocrMode: item.ocrMode
          }));
        
        setRecentActivity(recent);
      } catch (error) {
        console.warn('Failed to load sidebar data:', error);
      }
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Listen for processing completion events
    const handleProcessingComplete = (data) => {
      // Use setTimeout to defer state updates and avoid render phase issues
      setTimeout(() => {
        // Show updating indicator
        setIsUpdating(true);
        
        // Update immediately when processing completes
        loadData();
        
        // Hide updating indicator after a short delay
        setTimeout(() => setIsUpdating(false), 1000);
      }, 0);
    };

    eventBus.on('processingComplete', handleProcessingComplete);
    
    // Refresh data every 10 seconds (less frequent since we have real-time updates)
    const interval = setInterval(loadData, 10000);
    
    return () => {
      eventBus.off('processingComplete', handleProcessingComplete);
      clearInterval(interval);
    };
  }, [loadData]);

  const menuItems = [
    { 
      name: "Dashboard", 
      id: "dashboard", 
      icon: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20"
    },
    { 
      name: "Test OCR", 
      id: "test-ocr", 
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      color: "text-green-400",
      bgColor: "bg-green-500/20"
    },
    { 
      name: "Preprocess OCR", 
      id: "preprocess-ocr", 
      icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20"
    },
    { 
      name: "History", 
      id: "history", 
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "text-orange-400",
      bgColor: "bg-orange-500/20",
      count: historyCount
    },
    { 
      name: "Settings", 
      id: "settings", 
      icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
      color: "text-gray-400",
      bgColor: "bg-gray-500/20"
    },
    { 
      name: "Advanced", 
      id: "advanced", 
      icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
      color: "text-indigo-400",
      bgColor: "bg-indigo-500/20"
    }
  ];

  const quickActions = [
    { name: "Upload Image", icon: "M12 6v6m0 0v6m0-6h6m-6 0H6", action: () => document.getElementById('file-upload')?.click() },
    { name: "Clear History", icon: "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16", action: () => {
      if (window.confirm('Clear all processing history?')) {
        localStorage.removeItem('ocr-analytics-data');
        localStorage.removeItem('ocr-deleted-items');
        window.location.reload();
      }
    }},
    { name: "Export Data", icon: "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", action: () => {
      const data = {
        analytics: localStorage.getItem('ocr-analytics-data'),
        deleted: localStorage.getItem('ocr-deleted-items'),
        stats: localStorage.getItem('ocr-processing-stats')
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }}
  ];

  const formatTime = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className={`h-screen bg-gray-800 text-white flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-80'
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Hand2Data
                </h1>
                <p className="text-xs text-gray-400 flex items-center">
                  OCR Processing Suite
                  {isUpdating && (
                    <span className="ml-2 flex items-center text-green-400">
                      <svg className="w-3 h-3 animate-spin mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Updating...
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        </div>
      </div>

      {/* Search */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600/50 rounded-xl py-2 px-3 pl-10 text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}


      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems
            .filter(item => !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((item) => (
            <div
              key={item.id}
              className={`group relative flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activePage === item.id 
                  ? `${item.bgColor} ${item.color} shadow-lg` 
                  : "hover:bg-gray-700/50 text-gray-300 hover:text-white"
              }`}
              onClick={() => setActivePage(item.id)}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3'}`}>
                <div className={`p-2 rounded-lg ${activePage === item.id ? item.bgColor : 'bg-gray-600/50'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </div>
                {!isCollapsed && (
                  <>
                    <span className="font-medium">{item.name}</span>
                    {item.count !== undefined && (
                      <div className="ml-auto">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.count > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-gray-600/50 text-gray-400'
                        }`}>
                          {item.count}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                  {item.name}
                  {item.count !== undefined && (
                    <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded">
                      {item.count}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>

      {/* Recent Activity */}
      {!isCollapsed && recentActivity.length > 0 && (
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors duration-200">
                <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 truncate">{activity.fileName}</p>
                  <p className="text-xs text-gray-500">{formatTime(activity.timestamp)} • {activity.ocrMode}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-700">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Actions</h3>
          <div className="space-y-1">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="w-full flex items-center space-x-3 p-2 hover:bg-gray-700/30 rounded-lg transition-colors duration-200 text-gray-300 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
                <span className="text-sm">{action.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {!isCollapsed ? (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">U</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-300">User</p>
              <p className="text-xs text-gray-500">OCR Specialist</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-white">U</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
