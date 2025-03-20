// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // If in production (Vercel) environment
  if (process.env.NODE_ENV === 'production') {
    // If your backend is separately deployed, set this environment variable
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Use window.location.origin which includes protocol, hostname, and port
    // This works better than manually constructing the URL
    console.log('Using current origin as API path in production:', window.location.origin);
    return window.location.origin;
  }
  
  // For development, try to get the port from localStorage
  try {
    // Try to read the port from localStorage (set by other components)
    const savedPort = localStorage.getItem('apiPort') || '5001';
    console.log(`Using API port: ${savedPort}`);
    return `http://localhost:${savedPort}`;
  } catch (error) {
    console.error('Error getting API port:', error);
    // Default to port 5001 if we can't read the saved port
    return 'http://localhost:5001';
  }
};

// Create a function to get the socket URL for Socket.io
const getSocketUrl = () => {
  // For production, use the same url determination as API
  if (process.env.NODE_ENV === 'production') {
    if (process.env.REACT_APP_SOCKET_URL) {
      return process.env.REACT_APP_SOCKET_URL;
    }
    
    // In production, we use the same origin for socket connections
    console.log('Using current origin for socket in production:', window.location.origin);
    return window.location.origin;
  }
  
  // For development, use the API base URL
  return getApiBaseUrl();
};

export { getApiBaseUrl, getSocketUrl }; 