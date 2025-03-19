// Get the API base URL based on environment
const getApiBaseUrl = () => {
  // If in production (Vercel) environment
  if (process.env.NODE_ENV === 'production') {
    // If your backend is separately deployed, set this environment variable
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Detect if we're on Vercel or similar platform
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname.includes('netlify.app')) {
      console.log('Detected deployment on Vercel/Netlify');
      // If you have a separately deployed backend API, use its URL here
      // Currently using a relative path, which assumes backend is deployed alongside frontend
      return '';
    }
    
    // For self-hosted deployments where frontend and backend are on same domain
    console.log('Using relative API path in production');
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
  // For production, use the same url determination as API
  if (process.env.NODE_ENV === 'production') {
    if (process.env.REACT_APP_SOCKET_URL) {
      return process.env.REACT_APP_SOCKET_URL;
    }
    
    // Default to the current origin (assumes socket server is on same host)
    console.log('Using current origin for socket in production');
    return window.location.origin;
  }
  
  // For development, use the API base URL
  return getApiBaseUrl();
};

export { getApiBaseUrl, getSocketUrl }; 