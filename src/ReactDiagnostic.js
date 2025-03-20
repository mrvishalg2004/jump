import React, { useEffect, useState } from 'react';

/**
 * A component that helps diagnose React rendering issues.
 * This will log information about the React environment and
 * attempt to identify common problems.
 */
function ReactDiagnostic() {
  const [diagnosticInfo, setDiagnosticInfo] = useState({
    reactVersion: React.version,
    renderTime: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    windowDefined: typeof window !== 'undefined',
    documentDefined: typeof document !== 'undefined',
    errors: []
  });

  useEffect(() => {
    try {
      // Check for common issues
      const issues = [];
      
      // Check if we're running in a browser environment
      if (typeof window === 'undefined' || typeof document === 'undefined') {
        issues.push('Not running in browser environment');
      }
      
      // Check if React is properly loaded
      if (!React || !React.version) {
        issues.push('React not properly loaded');
      }
      
      // Check for DOM-related issues
      if (typeof document !== 'undefined') {
        const rootElement = document.getElementById('root');
        if (!rootElement) {
          issues.push('Root element not found');
        } else if (rootElement.children.length === 0) {
          issues.push('Root element is empty');
        }
      }
      
      // Check for potential memory issues
      if (typeof window !== 'undefined' && window.performance) {
        const memory = window.performance.memory;
        if (memory && memory.usedJSHeapSize > 0.9 * memory.jsHeapSizeLimit) {
          issues.push('Memory usage is high');
        }
      }
      
      // Update the state with any issues found
      setDiagnosticInfo(prev => ({
        ...prev,
        errors: issues,
        browserInfo: typeof navigator !== 'undefined' ? {
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookiesEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine
        } : 'Navigator not available'
      }));
      
      // Log diagnostic info to console
      console.log('[React Diagnostic]', {
        reactVersion: React.version,
        renderTime: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        issues,
        url: window?.location?.href
      });
      
      // Send diagnostic info to an endpoint if available
      if (window.fetch) {
        try {
          fetch('/api/diagnostic', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reactVersion: React.version,
              renderTime: new Date().toISOString(),
              environment: process.env.NODE_ENV,
              issues,
              url: window?.location?.href,
              browserInfo: typeof navigator !== 'undefined' ? {
                userAgent: navigator.userAgent,
                language: navigator.language,
                cookiesEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine
              } : 'Navigator not available'
            })
          }).catch(e => console.error('Error sending diagnostic info:', e));
        } catch (err) {
          console.error('Failed to send diagnostic info:', err);
        }
      }
    } catch (err) {
      console.error('Error in diagnostic component:', err);
      setDiagnosticInfo(prev => ({
        ...prev,
        errors: [...prev.errors, `Error during diagnosis: ${err.message}`]
      }));
    }
  }, []);

  // Return null to avoid rendering anything in the DOM
  return null;
}

export default ReactDiagnostic; 