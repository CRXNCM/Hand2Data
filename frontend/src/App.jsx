import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import Settings from './pages/Settings';
import Advanced from './pages/Advanced';
import TestOCR from './pages/TestOCR';
import PreprocessOCR from './pages/PreprocessOCR';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';


const AppContent = () => {
  const { getUISettings } = useSettings();
  const uiSettings = getUISettings();
  
  const [activePage, setActivePage] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Apply theme classes based on settings
  const getThemeClasses = () => {
    const baseClasses = "flex flex-col md:flex-row h-screen overflow-hidden";
    
    switch (uiSettings.theme) {
      case 'light':
        return `${baseClasses} bg-gray-50 text-gray-900`;
      case 'dark':
        return `${baseClasses} bg-gray-950 text-white`;
      case 'auto':
        return `${baseClasses} bg-gray-950 text-white dark:bg-gray-50 dark:text-gray-900`;
      default:
        return `${baseClasses} bg-gray-950 text-white`;
    }
  };

  const getFontSizeClasses = () => {
    switch (uiSettings.fontSize) {
      case 'small':
        return 'text-sm';
      case 'medium':
        return 'text-base';
      case 'large':
        return 'text-lg';
      case 'xl':
        return 'text-xl';
      default:
        return 'text-base';
    }
  };

  // Render the active page component
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'history':
        return <History />;
      case 'settings':
        return <Settings />;
      case 'advanced':
        return <Advanced />;
      case 'test-ocr':
        return <TestOCR />;
      case 'preprocess-ocr':
        return <PreprocessOCR />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className={`${getThemeClasses()} ${getFontSizeClasses()}`}>
      {/* Mobile menu toggle */}
      <div className="md:hidden bg-gray-800 p-2">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-white p-2 rounded hover:bg-gray-700"
        >
          {isMobileMenuOpen ? '✕' : '☰'}
        </button>
      </div>
      
      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block z-10 ${isMobileMenuOpen ? 'absolute inset-y-0 left-0 mt-10' : ''}`}>
        <Sidebar
          activePage={activePage}
          setActivePage={(page) => {
            setActivePage(page);
            setIsMobileMenuOpen(false);
          }}
        />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar activePage={activePage} />
        <main className="flex-1 overflow-y-auto p-4">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;