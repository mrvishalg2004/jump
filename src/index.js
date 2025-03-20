import './polyfills';
import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"

// Fallback rendering in case createRoot fails
let root;
try {
  root = ReactDOM.createRoot(document.getElementById("root"));
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error('Error creating root:', error);
  
  // Fallback to legacy render method
  try {
    console.log('Attempting fallback render method');
    const rootElement = document.getElementById('root');
    
    if (rootElement) {
      if (ReactDOM.render) {
        ReactDOM.render(
          <React.StrictMode>
            <App />
          </React.StrictMode>,
          rootElement
        );
      } else {
        rootElement.innerHTML = `
          <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
            <h1>Unable to load application</h1>
            <p>We're having trouble rendering the app. Please try refreshing the page or using a different browser.</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1eb2a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
              Refresh Page
            </button>
          </div>
        `;
      }
    }
  } catch (fallbackError) {
    console.error('Fallback render also failed:', fallbackError);
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1>Critical Error</h1>
        <p>We cannot load the application. Please try refreshing or contact support.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #1eb2a6; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 20px;">
          Refresh Page
        </button>
      </div>
    `;
  }
}
