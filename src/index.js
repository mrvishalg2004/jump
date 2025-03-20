import './polyfills';
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

console.log('Starting application initialization');

// Display environment information
console.log('Environment:', {
  nodeEnv: process.env.NODE_ENV,
  isProduction: process.env.NODE_ENV === 'production',
  isVercel: typeof window !== 'undefined' && window.location && window.location.hostname.includes('vercel.app'),
  reactVersion: React.version,
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
});

// Function to send initialization data to backend for logging
function sendInitData() {
  try {
    if (typeof window !== 'undefined' && window.fetch) {
      window.fetch('/api/init-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          location: window.location.href,
          userAgent: navigator.userAgent,
          reactVersion: React.version,
          rootElement: !!document.getElementById('root')
        })
      }).catch(err => console.warn('Could not send init data:', err));
    }
  } catch (e) {
    console.warn('Error in sendInitData:', e);
  }
}

// Attempt to send init data after a short delay
setTimeout(sendInitData, 1000);

// Fallback rendering in case createRoot fails
let root;
try {
  console.log('Attempting to create root with React', React.version);
  const rootElement = document.getElementById("root");
  console.log('Root element found:', !!rootElement);
  
  if (!rootElement) {
    console.error('Root element not found, creating one');
    const newRoot = document.createElement('div');
    newRoot.id = 'root';
    document.body.appendChild(newRoot);
    root = ReactDOM.createRoot(newRoot);
  } else {
    root = ReactDOM.createRoot(rootElement);
  }
  
  console.log('Root created successfully, rendering app');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('Render call completed');
} catch (error) {
  console.error('Error creating root:', error);
  
  // Fallback to legacy render method
  try {
    console.log('Attempting fallback render method');
    const rootElement = document.getElementById('root');
    
    if (rootElement) {
      if (ReactDOM.render) {
        console.log('Using legacy ReactDOM.render');
        ReactDOM.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
          rootElement
        );
        console.log('Legacy render completed');
      } else {
        console.error('ReactDOM.render not available');
        rootElement.innerHTML = `
          <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h1>Unable to load application</h1>
            <p>We're having trouble rendering the app. Please try refreshing the page or using a different browser.</p>
            <p>Error: ReactDOM.render not available</p>
            <p>React version: ${React.version}</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1eb2a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
              Refresh Page
            </button>
            <button onclick="window.location.href='/minimal.html'" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 20px 0 0 10px;">
              Try Minimal Version
            </button>
          </div>
        `;
      }
    } else {
      console.error('Root element not found for fallback');
      document.body.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
          <h1>Application Error</h1>
          <p>Could not find the root element to render the application.</p>
          <p>Please try refreshing the page or using a different browser.</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1eb2a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
            Refresh Page
          </button>
        </div>
      `;
    }
  } catch (fallbackError) {
    console.error('Fallback render also failed:', fallbackError);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>Critical Error</h1>
        <p>We cannot load the application. Please try refreshing or contact support.</p>
        <p>Error details: ${fallbackError.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1eb2a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
          Refresh Page
        </button>
        <button onclick="window.location.href='/minimal.html'" style="padding: 10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; margin: 20px 0 0 10px;">
          Try Minimal Version
        </button>
      </div>
    `;
  }
}
