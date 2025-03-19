// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // If in production (Vercel) environment, use relative URL
  if (process.env.NODE_ENV === 'production') {
    // In production, use the current domain as the API base
    return '';
  }
  
  // For development, try to get the port from localStorage
  try {
    // Try to read the port from localStorage (set by other components)
    const savedPort = localStorage.getItem('apiPort') || '5000';
    console.log(`Using API port: ${savedPort}`);
    return `http://localhost:${savedPort}`;
  } catch (error) {
    console.error('Error getting API port:', error);
    // Default to port 5000 if we can't read the saved port
    return 'http://localhost:5000';
  }
};

// Create a function to get the socket URL for Socket.io
const getSocketUrl = () => {
  // For production, use the same URL as the current domain
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  
  // For development, use the API base URL
  return getApiBaseUrl();
};

export { getApiBaseUrl, getSocketUrl }; 