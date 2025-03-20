/**
 * Vercel Initialization Script
 * This script helps ensure the React app loads properly on Vercel
 */

(function() {
  console.log('Vercel initialization script running');
  
  // Set a timeout to show fallback content if the app doesn't load
  var appLoadTimeout = setTimeout(function() {
    var root = document.getElementById('root');
    if (!root || !root.children || root.children.length === 0) {
      console.log('App failed to load, showing fallback content');
      showFallbackContent();
    }
  }, 5000);
  
  // Function to show fallback content if the app doesn't load
  function showFallbackContent() {
    var root = document.getElementById('root');
    if (!root) {
      console.log('Root element not found, creating it');
      root = document.createElement('div');
      root.id = 'root';
      document.body.appendChild(root);
    }
    
    root.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
        <h1 style="color: #1eb2a6;">AI Odyssey Education</h1>
        <div style="background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2>Unable to Load Application</h2>
          <p>We're having trouble loading the application. This could be due to network issues or browser compatibility.</p>
          <p>Please try one of the following:</p>
          <ul style="text-align: left; display: inline-block;">
            <li>Refresh the page</li>
            <li>Clear your browser cache</li>
            <li>Try a different browser</li>
            <li>Check your internet connection</li>
          </ul>
          <button onclick="window.location.reload()" style="background-color: #1eb2a6; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
          <button onclick="window.location.href='/fallback-index.html'" style="background-color: #333; color: white; border: none; padding: 10px 20px; border-radius: 4px; margin-left: 10px; cursor: pointer;">
            Load Fallback Page
          </button>
        </div>
        <p style="margin-top: 20px; font-size: 14px; color: #666;">
          Error Code: VERCEL-LOAD-TIMEOUT
        </p>
      </div>
    `;
  }
  
  // Listen for app load event
  window.addEventListener('load', function() {
    var reactApp = document.querySelector('[data-reactroot]');
    if (reactApp) {
      console.log('React app loaded successfully');
      clearTimeout(appLoadTimeout);
    }
  });
  
  // Add this script to the page
  function addScript(src) {
    var script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.head.appendChild(script);
  }
  
  // Detect if we're in a browser that might have issues
  function isTroublesomeBrowser() {
    var ua = navigator.userAgent.toLowerCase();
    return (
      /msie/.test(ua) || // IE
      /trident/.test(ua) || // IE 11
      /edge/.test(ua) // Old Edge
    );
  }
  
  // If we're in a troublesome browser, use a polyfill service
  if (isTroublesomeBrowser()) {
    console.log('Detected browser that may need polyfills');
    addScript('https://polyfill.io/v3/polyfill.min.js?features=default,es6,fetch,Array.prototype.includes');
  }
})(); 