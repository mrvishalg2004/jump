// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // If in production (Vercel) environment
  if (process.env.NODE_ENV === 'production') {
    // If your backend is separately deployed, set this environment variable
    if (process.env.REACT_APP_API_URL) {
      console.log('Using configured API URL:', process.env.REACT_APP_API_URL);
      return process.env.REACT_APP_API_URL;
    }
    
    console.log('Using origin for API in production:', window.location.origin);
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
  // For production, create a websocket URL from the current location
  if (process.env.NODE_ENV === 'production') {
    if (process.env.REACT_APP_SOCKET_URL) {
      console.log('Using configured socket URL:', process.env.REACT_APP_SOCKET_URL);
      return process.env.REACT_APP_SOCKET_URL;
    }
    
    // Use the same origin for socket connections, 
    // but ensure we're using the proper protocol (wss for https)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${window.location.origin}`.replace(/^http/, 'ws');
    
    console.log('Created WebSocket URL for production:', wsUrl);
    return window.location.origin; // Socket.io client will handle the protocol
  }
  
  // For development, use the API base URL
  return getApiBaseUrl();
};

export { getApiBaseUrl, getSocketUrl }; 