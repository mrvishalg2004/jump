import axios from 'axios';

// Function to check various ports and find the one where the backend is running
const checkBackendPort = async () => {
  // Ports to try, in order of preference
  // Start with port 5001 since that's what the backend is running on
  const portsToTry = [5001, 5000, 5002, 5003, 5004, 5005, 5006, 5007, 5008, 5009];
  let foundPort = null;
  
  console.log('Checking for backend server on available ports...');
  
  // First, check if we already have a saved port in localStorage
  const savedPort = localStorage.getItem('apiPort');
  if (savedPort) {
    try {
      // Try the saved port first
      console.log(`Trying saved port ${savedPort}...`);
      const response = await axios.get(`http://localhost:${savedPort}/api/players/game-state`, { 
        timeout: 2000 // Longer timeout for more reliable connection
      });
      
      if (response.status === 200) {
        console.log(`Backend confirmed on previously saved port ${savedPort}`);
        return parseInt(savedPort);
      }
    } catch (error) {
      console.log(`Saved port ${savedPort} is no longer valid, checking other ports...`);
      console.error('Error details:', error.message);
    }
  }
  
  // Try each port in sequence
  for (const port of portsToTry) {
    try {
      // Try to connect to the backend on this port
      console.log(`Trying port ${port}...`);
      const response = await axios.get(`http://localhost:${port}/api/players/game-state`, { 
        timeout: 2000 // Longer timeout for more reliable detection
      });
      
      // If we get a response, this is the correct port
      if (response.status === 200) {
        console.log(`Backend found on port ${port}`);
        localStorage.setItem('apiPort', port.toString());
        foundPort = port;
        break;
      }
    } catch (error) {
      // If connection failed, try the next port
      console.log(`Port ${port} not available: ${error.message}`);
    }
  }
  
  if (foundPort) {
    return foundPort;
  }
  
  // If we couldn't find the backend on any port, use port 5001 as default
  console.log('Could not find backend on any port, using default port 5001');
  localStorage.setItem('apiPort', '5001');
  return 5001;
};

export default checkBackendPort; 