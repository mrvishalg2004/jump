import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
    
    // You can also log to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px auto', 
          maxWidth: '800px',
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          color: '#333'
        }}>
          <h2 style={{ color: '#d32f2f' }}>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Show error details</summary>
            <p style={{ color: '#d32f2f', fontWeight: 'bold' }}>
              {this.state.error && this.state.error.toString()}
            </p>
            <p style={{ marginTop: '10px' }}>Component Stack:</p>
            <pre style={{ 
              padding: '10px', 
              backgroundColor: '#f8f8f8', 
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '14px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
          <div style={{ marginTop: '20px' }}>
            <button 
              onClick={() => window.location.reload()} 
              style={{
                backgroundColor: '#1eb2a6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary; 