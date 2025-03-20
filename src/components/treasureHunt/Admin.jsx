import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Admin.css';
import { generateHash, getLinkLocations, getDecoyDestinations } from '../../utils/linkHider';
import { getApiBaseUrl, getSocketUrl } from '../../utils/apiConfig';

// Use the utility function for API base URL
const API_BASE_URL = getApiBaseUrl();
console.log('==== API_BASE_URL ====', API_BASE_URL);

const Admin = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [socket, setSocket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [gameSettings, setGameSettings] = useState({ activeRound: 0 });
  const [roundActionLoading, setRoundActionLoading] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [playerRealLink, setPlayerRealLink] = useState(null);
  const [originalLinkPosition, setOriginalLinkPosition] = useState(null);
  const [qualifiedPlayers, setQualifiedPlayers] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Define fetchPlayers before any useEffect hooks that use it
  const fetchPlayers = useCallback(async () => {
    try {
      setError(''); // Clear any previous errors
      
      console.log(`Fetching players from: ${API_BASE_URL}/api/players/admin/players`);
      
      const response = await axios.get(`${API_BASE_URL}/api/players/admin/players`, {
        timeout: 8000 // Increase timeout for more reliable connection
      });
      
      if (response.data.success) {
        const allPlayers = response.data.players || [];
        console.log(`Received ${allPlayers.length} players from server`);
        
        // Sort players by timestamp (newest first)
        const sortedPlayers = [...allPlayers].sort((a, b) => {
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
        
        setPlayers(sortedPlayers);
        
        // Filter qualified players
        const qualified = sortedPlayers.filter(player => player.status === 'Qualified for Round 2');
        console.log('Qualified players:', qualified.length);
        setQualifiedPlayers(qualified);
        
        // Update game settings if they changed
        if (response.data.gameSettings) {
          setGameSettings(response.data.gameSettings);
        }
        
        setError('');
        console.log(`Successfully fetched ${allPlayers.length} players (${qualified.length} qualified)`);
      } else {
        setError('Failed to fetch players data: ' + response.data.message);
        console.error('API returned error:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (!error.response) {
        setError(`Network error. Please check that the backend server is running on port ${localStorage.getItem('apiPort') || '5000'}.`);
      } else {
        setError('Failed to fetch players data: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Check localStorage for authentication on component mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
    if (isAuthenticated) {
      setAuthenticated(true);
    }
    
    // Check what port is being used
    console.log('Current API port in localStorage:', localStorage.getItem('apiPort') || 'not set');
    console.log('Using API_BASE_URL:', API_BASE_URL);
  }, []);

  // Add useEffect to fetch players on mount and when authenticated and to refresh periodically
  useEffect(() => {
    if (authenticated) {
      setLoading(true);
      fetchPlayers();
      
      // Set up an interval to refresh the data every 20 seconds
      const intervalId = setInterval(() => {
        console.log('Periodic refresh of player list');
        fetchPlayers();
      }, 20000);
      
      return () => clearInterval(intervalId);
    }
  }, [authenticated, fetchPlayers]);

  // Connect to socket.io server
  useEffect(() => {
    // Set up socket connection
    const socketUrl = getSocketUrl();
    console.log('Admin connecting to socket server at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      upgrade: true,
      forceNew: true,
      autoConnect: true
    });
    
    setSocket(newSocket);
    
    // Attempt to check socket.io endpoint availability
    const checkSocketEndpoint = async () => {
      try {
        const apiUrl = getApiBaseUrl();
        console.log('Checking socket endpoint at:', `${apiUrl}/socket-check`);
        const response = await axios.get(`${apiUrl}/socket-check`, {
          timeout: 5000,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        console.log('Socket check endpoint response:', response.data);
        
        if (response.data && response.data.socketAvailable) {
          console.log('Socket server confirmed available via REST endpoint');
          setConnectionError(null);
        }
      } catch (error) {
        console.error('Failed to check socket endpoint:', error);
        setConnectionError('Socket server health check failed. Check server logs.');
      }
    };
    
    checkSocketEndpoint();
    
    // Log socket connection events
    newSocket.on('connect', () => {
      console.log('Admin socket connected successfully with ID:', newSocket.id);
      setSocketConnected(true);
      setConnectionError(null);
      
      // Join admin room
      newSocket.emit('joinAdminRoom', { adminId: 'admin-dashboard' });
      console.log('Joined admin room');
      
      // Request initial player data
      newSocket.emit('getPlayerData');
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setSocketConnected(false);
      setConnectionError(`Connection error: ${err.message}`);
      
      // Attempt to reconnect after a delay
      setTimeout(() => {
        if (!newSocket.connected) {
          console.log('Attempting to reconnect socket...');
          newSocket.connect();
        }
      }, 5000);
    });
    
    newSocket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
      setSocketConnected(false);
      setConnectionError('Connection timed out');
    });
    
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setSocketConnected(false);
      if (reason === 'io server disconnect') {
        // The server has forcefully disconnected the connection
        setConnectionError('Disconnected by server. Please refresh the page.');
      } else {
        setConnectionError('Connection lost. Attempting to reconnect...');
        // The socket will automatically try to reconnect
      }
    });
    
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconnected after ${attemptNumber} attempts`);
      setSocketConnected(true);
      setConnectionError(null);
      
      // Re-join admin room after reconnection
      newSocket.emit('joinAdminRoom', { adminId: 'admin-dashboard' });
      
      // Request fresh player data
      newSocket.emit('getPlayerData');
    });
    
    // Listen for player updates
    newSocket.on('playerUpdate', (data) => {
      console.log('Received player update:', data);
      
      if (data.type === 'qualification') {
        // Handle qualification update specifically to update UI immediately
        const updatedPlayer = data.player;
        
        // Update the qualified players list without waiting for fetchPlayers
        setQualifiedPlayers(prevQualified => {
          // Check if player is already in the list
          const existingIndex = prevQualified.findIndex(p => p.playerId === updatedPlayer.playerId);
          if (existingIndex >= 0) {
            // Update existing player
            const updatedList = [...prevQualified];
            updatedList[existingIndex] = { ...updatedList[existingIndex], ...updatedPlayer };
            return updatedList;
          } else {
            // Add new qualified player
            return [...prevQualified, updatedPlayer];
          }
        });
        
        // Also update in the main players list
        setPlayers(prevPlayers => {
          return prevPlayers.map(p => {
            if (p.playerId === updatedPlayer.playerId) {
              return { ...p, ...updatedPlayer };
            }
            return p;
          });
        });
      }
      
      // Fetch all players to ensure data consistency
      fetchPlayers();
    });

    // Listen for game state updates
    newSocket.on('gameStateUpdate', (data) => {
      setGameSettings(prevSettings => ({
        ...prevSettings,
        activeRound: data.activeRound
      }));
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [authenticated, fetchPlayers]);

  // Listen for socket events to update player list in real-time
  useEffect(() => {
    if (socket) {
      const handlePlayerUpdate = (data) => {
        console.log('Received player update via socket:', data);
        
        // If we have a player update with qualification or registration, handle it specially
        if (data.type === 'qualification' || data.type === 'registration') {
          console.log('Processing player update of type:', data.type);
          
          // Update specific player in the lists
          setPlayers(prevPlayers => {
            const updated = [...prevPlayers];
            const playerIndex = updated.findIndex(p => p.playerId === data.player.playerId);
            
            if (playerIndex >= 0) {
              // Update existing player
              console.log('Updating existing player in list:', data.player.username);
              updated[playerIndex] = {...updated[playerIndex], ...data.player};
            } else {
              // Add new player to the beginning of the list
              console.log('Adding new player to list:', data.player.username);
              updated.unshift(data.player);
            }
            
            return updated;
          });
          
          // If it's a qualification, also update the qualified players list
          if (data.type === 'qualification') {
            setQualifiedPlayers(prevQualified => {
              const exists = prevQualified.some(p => p.playerId === data.player.playerId);
              if (exists) {
                return prevQualified.map(p => 
                  p.playerId === data.player.playerId ? {...p, ...data.player} : p
                );
              }
              return [...prevQualified, data.player];
            });
          }
        } else {
          // For other types of updates, simply refresh the full list
          fetchPlayers();
        }
      };
      
      // Listen for player updates
      socket.on('playerUpdate', handlePlayerUpdate);
      
      // Listen for game reset
      socket.on('gameReset', () => {
        console.log('Game reset notification received');
        fetchPlayers();
      });
      
      return () => {
        socket.off('playerUpdate', handlePlayerUpdate);
        socket.off('gameReset');
      };
    }
  }, [socket, fetchPlayers]);

  // Handle authentication
  const handleAuthentication = (e) => {
    e.preventDefault();
    
    // Check admin credentials
    if (password === 'vishalgolhar10@gmail.com#8421236102#7350168049' && 
        email === 'vishalgolhar10@gmail.com') {
      setAuthenticated(true);
      // Store authentication state in localStorage
      localStorage.setItem('adminAuthenticated', 'true');
      fetchPlayers();
      fetchOriginalLinkPosition();
    } else {
      setError('Invalid email or password');
    }
  };

  // Add logout function
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      setAuthenticated(false);
      localStorage.removeItem('adminAuthenticated');
      if (socket) {
        socket.disconnect();
      }
    }
  };
  
  // Handle game reset
  const handleResetGame = async () => {
    if (window.confirm('Are you sure you want to reset the game? This will delete all player data and require players to register again.')) {
      try {
        setError(''); // Clear any previous errors
        const response = await axios.post(`${API_BASE_URL}/api/players/admin/reset`, {}, {
          timeout: 5000 // 5 second timeout
        });
        
        if (response.data.success) {
          await fetchPlayers(); // Refresh the player list
          alert('Game reset successfully');
          
          // Emit update to all admins and notify players to re-register
          if (socket && socket.connected) {
            socket.emit('playerUpdate', { action: 'reset' });
            
            // Force a stronger reset signal that will refresh client pages
            socket.emit('gameReset', { 
              timestamp: new Date().getTime(),
              forceRefresh: true
            });
          }
        } else {
          setError('Failed to reset game: ' + response.data.message);
        }
      } catch (error) {
        console.error('Error resetting game:', error);
        if (error.code === 'ECONNABORTED') {
          setError('Request timed out. Please try again.');
        } else if (!error.response) {
          setError('Network error. Please check your connection to the game server.');
        } else {
          setError('Failed to reset game: ' + (error.response?.data?.message || error.message));
        }
      }
    }
  };

  // Set active round
  const handleSetRound = async (roundNumber) => {
    try {
      setRoundActionLoading(true);
      setError(''); // Clear any previous errors
      
      const response = await axios.post(`${API_BASE_URL}/api/players/admin/set-round`, {
        roundNumber
      }, {
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data.success) {
        setGameSettings(response.data.gameSettings);
        // No need to fetch players again as the socket will handle updates
      } else {
        setError('Failed to set round: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error setting round:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (!error.response) {
        setError('Network error. Please check your connection to the game server.');
      } else {
        setError('Failed to set round: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setRoundActionLoading(false);
    }
  };

  // Get the real link location for a player
  const getRealLinkLocation = useCallback((playerId) => {
    if (!playerId) return null;
    
    const allLocations = getLinkLocations();
    const hash = generateHash(playerId);
    
    // Find the real link location based on the player's hash
    for (let i = 0; i < allLocations.length; i++) {
      const locationIndex = i;
      const isVisible = (hash + locationIndex) % 7 === 0;
      const isReal = isVisible && (hash + locationIndex) % allLocations.length === hash % allLocations.length;
      
      if (isReal) {
        // This is the real link location
        const location = allLocations[i];
        return {
          page: location.page,
          section: location.section,
          position: location.position,
          linkId: `link-${playerId}-${location.page}-${location.section}-${location.position}`
        };
      }
    }
    
    return null;
  }, []);

  // Fetch original link position for admin
  const fetchOriginalLinkPosition = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/players/admin/original-link`, {
        timeout: 5000
      });
      
      if (response.data.success) {
        setOriginalLinkPosition(response.data.originalLinkPosition);
      } else {
        setError('Failed to fetch original link position: ' + response.data.message);
      }
    } catch (error) {
      console.error('Error fetching original link position:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please try again.');
      } else if (!error.response) {
        setError('Network error. Please check your connection to the game server.');
      } else {
        setError('Failed to fetch original link position: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  useEffect(() => {
    if (authenticated) {
      fetchOriginalLinkPosition();
    }
  }, [authenticated]);

  // Display original link position
  const renderOriginalLinkPosition = () => {
    return (
      <div className="original-link-info">
        <h3>Original Link Position</h3>
        <p>{originalLinkPosition ? `The original link is hidden at: ${originalLinkPosition}` : 'Loading...'}</p>
      </div>
    );
  };

  // View player details
  const viewPlayerDetails = (player) => {
    setSelectedPlayer(player);
    // Get the real link location for this player
    const realLink = getRealLinkLocation(player.playerId);
    setPlayerRealLink(realLink);
  };

  // Close player details modal
  const closePlayerDetails = () => {
    setSelectedPlayer(null);
  };
  
  // Manually qualify a player 
  const handleManuallyQualifyPlayer = async (player) => {
    if (!player || !player.playerId) return;
    
    if (window.confirm(`Are you sure you want to manually qualify ${player.username} for Round 2?`)) {
      try {
        setError('');
        console.log(`Manually qualifying player: ${player.username} (${player.playerId})`);
        console.log(`Using API Base URL: ${API_BASE_URL}`);
        
        // Force refresh the API_BASE_URL to ensure we have the latest port
        const refreshedBaseUrl = getApiBaseUrl();
        console.log('Refreshed API Base URL:', refreshedBaseUrl);
        
        // First try: use the simple-qualify endpoint
        let qualifyUrl = `${refreshedBaseUrl}/api/players/simple-qualify`;
        console.log('Using qualification endpoint:', qualifyUrl);
        
        // Log the request payload
        const payload = {
          playerId: player.playerId,
          username: player.username
        };
        console.log('Request payload:', JSON.stringify(payload));
        
        let success = false;
        let errorMessage = '';
        
        // Try simple-qualify first
        try {
          console.log(`Making qualification request to: ${qualifyUrl}`);
          const response = await axios.post(qualifyUrl, payload, {
            timeout: 5000
          });
          
          console.log('Qualification response:', response.data);
          
          if (response.data.success) {
            success = true;
            // Update the UI immediately without waiting for server refresh
            updateQualifiedPlayer(player);
            
            // Show success message
            alert(`${player.username} has been manually qualified for Round 2!`);
          } else {
            errorMessage = response.data.message || 'Unknown error';
            console.error('Server returned error:', response.data);
          }
        } catch (error) {
          console.log('Error with simple-qualify, trying fallback...', error);
          
          // Try direct-qualify as fallback
          try {
            console.log('Attempting direct-qualify fallback...');
            qualifyUrl = `${refreshedBaseUrl}/api/players/direct-qualify`;
            console.log(`Making fallback request to: ${qualifyUrl}`);
            
            const fallbackResponse = await axios.post(qualifyUrl, payload, {
              timeout: 5000
            });
            
            console.log('Fallback qualification response:', fallbackResponse.data);
            
            if (fallbackResponse.data.success) {
              success = true;
              // Update the UI immediately without waiting for server refresh
              updateQualifiedPlayer(player);
              
              // Show success message
              alert(`${player.username} has been manually qualified for Round 2!`);
            } else {
              errorMessage = fallbackResponse.data.message || 'Unknown error with fallback method';
              console.error('Fallback server returned error:', fallbackResponse.data);
            }
          } catch (fallbackError) {
            console.error('Both qualification methods failed:', fallbackError);
            
            // Try one last attempt: create a qualified player directly via admin API
            try {
              console.log('Attempting final method: admin update-status...');
              const adminUrl = `${refreshedBaseUrl}/api/players/update-status`;
              
              const adminResponse = await axios.post(adminUrl, {
                playerId: player.playerId,
                username: player.username,
                status: 'Qualified for Round 2'
              }, {
                timeout: 5000
              });
              
              if (adminResponse.data.success) {
                success = true;
                // Update the UI immediately
                updateQualifiedPlayer(player);
                alert(`${player.username} has been manually qualified for Round 2 using admin method!`);
              } else {
                throw new Error(adminResponse.data.message || 'Admin qualification failed');
              }
            } catch (adminError) {
              console.error('All qualification methods failed:', adminError);
              throw fallbackError; // Re-throw the original error for handling
            }
          }
        }
        
        // If none of the methods succeeded, show error
        if (!success) {
          setError(`Failed to qualify player: ${errorMessage}`);
        }
      } catch (error) {
        console.error('Error qualifying player:', error);
        
        // Show detailed error message
        let errorMessage = 'Failed to qualify player: ';
        
        if (error.response) {
          // The server responded with a status code outside the 2xx range
          console.error('Server responded with error status:', error.response.status);
          console.error('Error response data:', error.response.data);
          
          // If HTML error page was returned, make it more readable
          if (typeof error.response.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
            errorMessage += `${error.response.status}: API endpoint not found. Please check server connection.`;
          } else {
            errorMessage += `${error.response.status}: ${error.response.data?.message || JSON.stringify(error.response.data) || 'Unknown error'}`;
          }
        } else if (error.request) {
          // The request was made but no response was received
          console.error('No response received from server:', error.request);
          errorMessage += 'No response from server. Please check if the server is running.';
        } else {
          // Something happened in setting up the request
          console.error('Error setting up request:', error.message);
          errorMessage += error.message;
        }
        
        setError(errorMessage);
      }
    }
  };
  
  // Helper function to update the UI after player qualification
  const updateQualifiedPlayer = (player) => {
    console.log('Updating qualified player in UI:', player);
    
    // Add the player to the qualified players list locally for immediate UI update
    const updatedPlayer = {
      ...player,
      status: 'Qualified for Round 2',
      timeTaken: 0 // Setting this to 0 for manually qualified players
    };
    
    // Update the qualified players list immediately
    setQualifiedPlayers(prevQualified => {
      // Check if player is already in the list to avoid duplicates
      const exists = prevQualified.some(p => p.playerId === player.playerId);
      console.log('Player exists in qualified list:', exists);
      
      if (exists) {
        // Update existing player instead of adding a duplicate
        return prevQualified.map(p => 
          p.playerId === player.playerId ? updatedPlayer : p
        );
      }
      // Add to qualified players list
      const newList = [...prevQualified, updatedPlayer];
      console.log('Updated qualified players list:', newList);
      return newList;
    });
    
    // Update the player in the main players list
    setPlayers(prevPlayers => {
      return prevPlayers.map(p => {
        if (p.playerId === player.playerId) {
          return updatedPlayer;
        }
        return p;
      });
    });
    
    // Emit socket event to update all admin panels
    if (socket && socket.connected) {
      console.log('Emitting qualification events via socket');
      
      socket.emit('playerQualified', {
        playerId: player.playerId,
        username: player.username,
        status: 'Qualified for Round 2',
        timeTaken: 0
      });
      
      // Also emit playerUpdate to ensure all admins get the update
      socket.emit('playerUpdate', {
        type: 'qualification',
        player: updatedPlayer
      });
    }
    
    // Close the player details modal if it's open
    if (selectedPlayer && selectedPlayer.playerId === player.playerId) {
      closePlayerDetails();
    }
    
    // Force immediate update of qualified players count in UI
    const qualifiedCount = document.querySelector('.qualified-count');
    if (qualifiedCount) {
      const count = qualifiedPlayers.length + (qualifiedPlayers.some(p => p.playerId === player.playerId) ? 0 : 1);
      qualifiedCount.textContent = `(${count})`;
    }
    
    // Refresh the player list from the server to ensure all data is in sync
    console.log('Refreshing player list after qualification...');
    fetchPlayers();
  };
  
  // Handle player disqualification
  const handleDisqualifyPlayer = async (player) => {
    if (!player || !player.playerId) return;
    
    if (window.confirm(`Are you sure you want to disqualify ${player.username} for cheating? This action cannot be undone.`)) {
      try {
        setError('');
        console.log('Disqualifying player:', player.username, 'with ID:', player.playerId);
        
        // Make the API call to update the database first
        const response = await axios.post(`${API_BASE_URL}/api/players/admin/disqualify`, {
          playerId: player.playerId,
          username: player.username,
          timestamp: Date.now() // Add timestamp for uniqueness
        });
        
        if (response.data.success) {
          alert(`${player.username} has been disqualified. Their screen is now frozen.`);
          
          // Refresh player list after a brief delay
          setTimeout(async () => {
            await fetchPlayers();
          }, 1000);
          
          closePlayerDetails();
        } else {
          setError('Failed to disqualify player: ' + response.data.message);
        }
      } catch (error) {
        console.error('Error disqualifying player:', error);
        setError('Failed to disqualify player: ' + (error.response?.data?.message || error.message));
      }
    }
  };
  
  // Add the sync port function to the Admin component 
  const syncPortWithServer = async () => {
    try {
      setError('');
      console.log('Manually syncing port with server...');
      
      // Try to get the port from current-port.txt file on the server
      const response = await fetch('/current-port.txt', {
        method: 'GET',
        cache: 'no-store' // Don't use cached version
      });
      
      if (response.ok) {
        const serverPort = await response.text();
        const trimmedPort = serverPort.trim();
        
        if (trimmedPort && !isNaN(parseInt(trimmedPort))) {
          console.log(`Found server port: ${trimmedPort}`);
          
          // Update localStorage
          localStorage.setItem('apiPort', trimmedPort);
          localStorage.setItem('lastCheckedPort', trimmedPort);
          localStorage.setItem('lastPortCheck', Date.now().toString());
          
          // Check if the port has changed
          const currentPort = API_BASE_URL.split(':')[2];
          if (currentPort !== trimmedPort) {
            console.log(`Port changed from ${currentPort} to ${trimmedPort}`);
            alert(`Port updated from ${currentPort} to ${trimmedPort}. The page will reload to apply the change.`);
            window.location.reload();
            return;
          }
          
          alert(`Successfully synced with server on port ${trimmedPort}.`);
        } else {
          throw new Error('Invalid port received from server');
        }
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      console.error('Error syncing port with server:', error);
      setError(`Failed to sync port: ${error.message}. Try direct manual entry below.`);
    }
  };

  // Add a function to manually set the port
  const manuallySetPort = () => {
    const portInput = prompt('Enter the server port number:');
    if (portInput && !isNaN(parseInt(portInput))) {
      const port = portInput.trim();
      console.log(`Manually setting port to: ${port}`);
      
      // Update localStorage
      localStorage.setItem('apiPort', port);
      localStorage.setItem('lastCheckedPort', port);
      localStorage.setItem('lastPortCheck', Date.now().toString());
      
      alert(`Port set to ${port}. The page will reload to apply the change.`);
      window.location.reload();
    } else if (portInput !== null) {
      alert('Please enter a valid port number.');
    }
  };
  
  // If not authenticated, show login form
  if (!authenticated) {
    return (
      <section className="admin">
        <div className="container">
          <div className="admin-content">
            <h1>Admin Login</h1>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleAuthentication} className="admin-login-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <button type="submit" className="login-btn">Login</button>
            </form>
          </div>
        </div>
      </section>
    );
  }
  
  if (loading) {
    return (
      <section className="admin">
        <div className="container">
          <div className="admin-content">
            <h1>Admin Dashboard</h1>
            <p>Loading player data...</p>
          </div>
        </div>
      </section>
    );
  }
  
  // Filter players based on search term
  const filteredPlayers = players
    .filter(player => 
      (player.username && player.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (player.playerId && player.playerId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (player.status && player.status.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(player => !showQualifiedOnly || player.status === 'Qualified for Round 2');

  // Get qualified players
  const qualificationStats = {
    totalTime: 0,
    averageTime: 0,
    fastestTime: qualifiedPlayers.length > 0 ? qualifiedPlayers[0].timeTaken / 1000 : 0,
    slowestTime: qualifiedPlayers.length > 0 ? qualifiedPlayers[qualifiedPlayers.length - 1].timeTaken / 1000 : 0
  };
  
  if (qualifiedPlayers.length > 0) {
    qualificationStats.totalTime = qualifiedPlayers.reduce((sum, player) => sum + player.timeTaken, 0) / 1000;
    qualificationStats.averageTime = qualificationStats.totalTime / qualifiedPlayers.length;
  }
  
  // Copy qualified players to clipboard
  const copyQualifiedPlayersToClipboard = () => {
    if (qualifiedPlayers.length === 0) {
      setCopySuccess('No qualified players to copy');
      setTimeout(() => setCopySuccess(''), 3000);
      return;
    }
    
    const qualifiedList = qualifiedPlayers.map((player, index) => 
      `${index + 1}. ${player.username} - ${(player.timeTaken / 1000).toFixed(2)}s`
    ).join('\n');
    
    navigator.clipboard.writeText(qualifiedList)
      .then(() => {
        setCopySuccess('Copied to clipboard!');
        setTimeout(() => setCopySuccess(''), 3000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setCopySuccess('Failed to copy');
        setTimeout(() => setCopySuccess(''), 3000);
      });
  };
  
  // Export qualified players as CSV
  const exportQualifiedPlayersAsCSV = () => {
    if (qualifiedPlayers.length === 0) {
      setCopySuccess('No qualified players to export');
      setTimeout(() => setCopySuccess(''), 3000);
      return;
    }
    
    // Create CSV content
    const headers = ['Rank', 'Player Name', 'Time (seconds)', 'Qualified At'];
    const csvContent = [
      headers.join(','),
      ...qualifiedPlayers.map((player, index) => [
        index + 1,
        player.username,
        (player.timeTaken / 1000).toFixed(2),
        new Date(player.timestamp).toLocaleString()
      ].join(','))
    ].join('\n');
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `qualified_players_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setCopySuccess('CSV exported!');
    setTimeout(() => setCopySuccess(''), 3000);
  };

  return (
    <section className="admin">
      <div className="container">
        <div className="admin-content">
          <h1>Admin Dashboard</h1>
          
          {/* Connection Status Indicator */}
          <div className="connection-status" style={{
            padding: '10px',
            margin: '10px 0',
            borderRadius: '5px',
            backgroundColor: socketConnected ? '#d4edda' : '#f8d7da',
            color: socketConnected ? '#155724' : '#721c24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>
              <strong>Server Connection:</strong> {socketConnected ? 'Connected' : 'Disconnected'}
              {connectionError && <span style={{ marginLeft: '10px' }}>{connectionError}</span>}
            </span>
            {!socketConnected && (
              <button 
                onClick={() => {
                  // Attempt to reconnect manually
                  if (socket) {
                    socket.connect();
                  } else {
                    window.location.reload();
                  }
                }}
                style={{
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
              >
                Reconnect
              </button>
            )}
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="admin-dashboard-header">
            <h1>Admin Dashboard</h1>
            
            <div className="server-connection-status">
              <h3>Server Connection</h3>
              <p>Connected to API at: {API_BASE_URL}</p>
              <div className="port-actions">
                <button 
                  className="sync-port-btn" 
                  onClick={syncPortWithServer}
                  title="Get the current port from the server"
                >
                  <span className="btn-icon">🔄</span> Sync Port
                </button>
                <button 
                  className="manual-port-btn" 
                  onClick={manuallySetPort}
                  title="Manually enter the server port"
                >
                  <span className="btn-icon">📝</span> Set Port Manually
                </button>
              </div>
            </div>
            
            <div className="quick-access-panel">
              <div className="quick-access-item">
                <h3>Qualified Players</h3>
                <p>View players who have qualified for Round 2</p>
                <a href="#qualified-players-section" className="quick-access-btn">
                  <span className="btn-icon">🏆</span>
                  Jump to Qualified Players
                </a>
              </div>
              
              <div className="quick-access-item">
                <h3>Game Controls</h3>
                <p>Manage game rounds and settings</p>
                <a href="#game-controls-section" className="quick-access-btn">
                  <span className="btn-icon">⚙️</span>
                  Jump to Game Controls
                </a>
              </div>
              
              <div className="quick-access-item">
                <h3>Admin Actions</h3>
                <p>Logout and manage session</p>
                <button onClick={handleLogout} className="quick-access-btn logout-btn">
                  <span className="btn-icon">🔓</span>
                  Logout
                </button>
              </div>
            </div>
          </div>
          
          {renderOriginalLinkPosition()}
          
          <div className="stats-container">
            <div className="stat-box">
              <h3>Total Players</h3>
              <p>{players.length}</p>
            </div>
            
            <div className="stat-box qualified">
              <h3>Qualified</h3>
              <p>{qualifiedPlayers.length} / 15</p>
            </div>
            
            <div className="stat-box playing">
              <h3>Playing</h3>
              <p>{players.length - qualifiedPlayers.length}</p>
            </div>
            
            <div className="stat-box failed">
              <h3>Failed</h3>
              <p>{players.length - qualifiedPlayers.length}</p>
            </div>
          </div>
          
          {/* Game Round Controls */}
          <div id="game-controls-section" className="admin-section">
            <h2 className="section-title">
              <span className="section-icon">⚙️</span>
              Game Round Controls
              <span className="section-subtitle">Manage active rounds and game settings</span>
            </h2>
            <div className="game-controls">
              <div className="round-status">
                <p>Current Active Round: 
                  <span className={`active-round round-${gameSettings.activeRound}`}>
                    {gameSettings.activeRound === 0 ? 'None' : `Round ${gameSettings.activeRound}`}
                  </span>
                </p>
              </div>
              <div className="round-progress">
                <div className={`round-step ${gameSettings.activeRound >= 1 ? 'active' : ''} ${gameSettings.activeRound > 1 ? 'completed' : ''}`}>
                  <div className="round-step-number">1</div>
                  <div className="round-step-label">Round 1</div>
                </div>
                <div className="round-connector"></div>
                <div className={`round-step ${gameSettings.activeRound >= 2 ? 'active' : ''} ${gameSettings.activeRound > 2 ? 'completed' : ''}`}>
                  <div className="round-step-number">2</div>
                  <div className="round-step-label">Round 2</div>
                </div>
                <div className="round-connector"></div>
                <div className={`round-step ${gameSettings.activeRound >= 3 ? 'active' : ''} ${gameSettings.activeRound > 3 ? 'completed' : ''}`}>
                  <div className="round-step-number">3</div>
                  <div className="round-step-label">Round 3</div>
                </div>
              </div>
              <div className="round-buttons">
                <button 
                  className={`round-btn ${gameSettings.activeRound === 0 ? 'active' : ''}`}
                  onClick={() => handleSetRound(0)}
                  disabled={roundActionLoading}
                >
                  Stop All Rounds
                </button>
                <button 
                  className={`round-btn round-1 ${gameSettings.activeRound === 1 ? 'active' : ''}`}
                  onClick={() => handleSetRound(1)}
                  disabled={roundActionLoading}
                >
                  Start Round 1
                </button>
                <button 
                  className={`round-btn round-2 ${gameSettings.activeRound === 2 ? 'active' : ''}`}
                  onClick={() => handleSetRound(2)}
                  disabled={roundActionLoading}
                >
                  Start Round 2
                </button>
                <button 
                  className={`round-btn round-3 ${gameSettings.activeRound === 3 ? 'active' : ''}`}
                  onClick={() => handleSetRound(3)}
                  disabled={roundActionLoading}
                >
                  Start Round 3
                </button>
              </div>
            </div>
          </div>
          
          {/* Qualified Players Section */}
          <div id="qualified-players-section" className="admin-section">
            <h2 className="section-title">
              <span className="section-icon">🏆</span>
              Qualified Players
              <span className="section-subtitle">Players who have successfully found the hidden link</span>
            </h2>
            <div className="qualified-players-section">
              <h2>Qualified Players (Round 2)</h2>
              <div className="qualified-players-count">
                Total Qualified: {qualifiedPlayers.length}
              </div>
              
              {loading ? (
                <div className="loading-message">Loading players data...</div>
              ) : error ? (
                <div className="error-message">{error}</div>
              ) : (
                qualifiedPlayers.length === 0 ? (
                  <div className="no-qualified-players">
                    <p>No players have qualified for Round 2 yet.</p>
                  </div>
                ) : (
                  <div className="qualified-players-container">
                    <div className="qualified-players-header">
                      <div className="qualified-rank">Rank</div>
                      <div className="qualified-name">Player Name</div>
                      <div className="qualified-time">Time Taken</div>
                      <div className="qualified-actions">Actions</div>
                    </div>
                    {qualifiedPlayers
                      // Sort players by time taken, but place manual qualifications (time = 0) at the bottom
                      .sort((a, b) => {
                        // If both are manual qualifications (time = 0), sort alphabetically
                        if (a.timeTaken === 0 && b.timeTaken === 0) {
                          return a.username.localeCompare(b.username);
                        }
                        // If only a is a manual qualification, place it after b
                        if (a.timeTaken === 0) return 1;
                        // If only b is a manual qualification, place it after a
                        if (b.timeTaken === 0) return -1;
                        // Otherwise sort by time taken
                        return a.timeTaken - b.timeTaken;
                      })
                      .map((player, index) => (
                        <div 
                          key={player.playerId} 
                          className={`qualified-player-row ${player.timeTaken === 0 ? 'manual-qualification' : ''}`}
                        >
                          <div className="qualified-rank">{index + 1}</div>
                          <div className="qualified-name">
                            {player.username}
                            {player.timeTaken === 0 && (
                              <span className="manual-qualification-badge" title="Manually Qualified">🔄</span>
                            )}
                          </div>
                          <div className="qualified-time">
                            {player.timeTaken === 0 
                              ? <span className="manual-time">Manual</span> 
                              : `${(player.timeTaken / 1000).toFixed(2)}s`}
                          </div>
                          <div className="qualified-actions">
                            <button 
                              className="view-details-btn"
                              onClick={() => viewPlayerDetails(player)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )
              )}
            </div>
            
            <div className="qualified-header-actions">
              <button 
                className="copy-qualified-btn" 
                onClick={copyQualifiedPlayersToClipboard}
                disabled={qualifiedPlayers.length === 0}
              >
                <span className="copy-icon">📋</span> Copy List
              </button>
              <button 
                className="export-csv-btn" 
                onClick={exportQualifiedPlayersAsCSV}
                disabled={qualifiedPlayers.length === 0}
              >
                <span className="export-icon">📊</span> Export CSV
              </button>
              {copySuccess && <span className="copy-success-message">{copySuccess}</span>}
            </div>
            
            {qualifiedPlayers.length > 0 && (
              <div className="qualification-stats">
                <div className="stat-item">
                  <span className="stat-label">Average Time:</span>
                  <span className="stat-value">{qualificationStats.averageTime.toFixed(2)}s</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Fastest Time:</span>
                  <span className="stat-value">{qualificationStats.fastestTime.toFixed(2)}s</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Slowest Time:</span>
                  <span className="stat-value">{qualificationStats.slowestTime.toFixed(2)}s</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="admin-actions">
            <button className="reset-btn" onClick={handleResetGame}>Reset Game</button>
            <button className="refresh-btn" onClick={fetchPlayers}>Refresh Data</button>
          </div>

          {/* Recent Players Section */}
          <div className="recent-players">
            <h2>Recent Players</h2>
            <div className="recent-players-list">
              {players.slice(0, 5).map(player => {
                const realLink = getRealLinkLocation(player.playerId);
                return (
                  <div key={player.playerId} className={`player-card ${player.status.toLowerCase().replace(/\s+/g, '-')}`}>
                    <h3>{player.username}</h3>
                    <p>Status: {player.status}</p>
                    <p>Joined: {new Date(player.timestamp).toLocaleTimeString()}</p>
                    {player.status === 'Qualified for Round 2' && (
                      <div className="qualified-badge">
                        <span className="badge-icon">✓</span>
                        <span className="badge-text">Qualified</span>
                        <p className="qualified-time-badge">{(player.timeTaken / 1000).toFixed(2)}s</p>
                      </div>
                    )}
                    {realLink && (
                      <div className="real-link-badge">
                        <span className="badge-icon">🔍</span>
                        <span className="badge-text">Real Link: {realLink.page}/{realLink.section}</span>
                      </div>
                    )}
                    <button onClick={() => viewPlayerDetails(player)}>View Details</button>
                  </div>
                );
              })}
              {players.length === 0 && <p>No players yet</p>}
            </div>
          </div>
          
          <div className="players-table-container">
            <h2>All Players</h2>
            
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by username, ID or status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <div className="filter-options">
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={showQualifiedOnly}
                    onChange={(e) => setShowQualifiedOnly(e.target.checked)}
                  />
                  Show qualified players only 
                  <span className="qualified-count">({qualifiedPlayers.length})</span>
                </label>
              </div>
            </div>
            
            {filteredPlayers.length === 0 ? (
              <p>{searchTerm ? 'No players match your search' : 'No players yet'}</p>
            ) : (
              <table className="players-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Player ID</th>
                    <th>Status</th>
                    <th>Time Taken</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map((player) => (
                    <tr key={player.playerId} className={player.status.toLowerCase().replace(/\s+/g, '-')}>
                      <td className="username-cell">
                        {player.username}
                        {player.status === 'Qualified for Round 2' && (
                          <span className="table-qualified-badge" title="Qualified for Round 2">🏆</span>
                        )}
                      </td>
                      <td>{player.playerId}</td>
                      <td>{player.status}</td>
                      <td>{player.timeTaken ? `${(player.timeTaken / 1000).toFixed(2)}s` : 'N/A'}</td>
                      <td>{new Date(player.timestamp).toLocaleString()}</td>
                      <td>
                        <button 
                          className="view-details-btn"
                          onClick={() => viewPlayerDetails(player)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Player Details Modal */}
          {selectedPlayer && (
            <div className="player-details-modal">
              <div className="modal-content">
                <span className="close-btn" onClick={closePlayerDetails}>&times;</span>
                <h2>Player Details</h2>
                
                {selectedPlayer.status === 'Qualified for Round 2' && (
                  <div className="qualification-banner">
                    <div className="qualification-icon">🏆</div>
                    <div className="qualification-info">
                      <h3>Qualified for Round 2</h3>
                      {selectedPlayer.timeTaken === 0 ? (
                        <p>Manually qualified by admin</p>
                      ) : (
                        <p>Time: {(selectedPlayer.timeTaken / 1000).toFixed(2)} seconds</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="player-info">
                  <div className="info-group">
                    <h3>Username</h3>
                    <p className="highlight">{selectedPlayer.username}</p>
                  </div>
                  <div className="info-group">
                    <h3>Player ID</h3>
                    <p>{selectedPlayer.playerId}</p>
                  </div>
                  <div className="info-group">
                    <h3>Status</h3>
                    <p className={selectedPlayer.status.toLowerCase().replace(/\s+/g, '-')}>
                      {selectedPlayer.status}
                    </p>
                  </div>
                  <div className="info-group">
                    <h3>Time Taken</h3>
                    <p>{selectedPlayer.timeTaken ? `${(selectedPlayer.timeTaken / 1000).toFixed(2)} seconds` : 'N/A'}</p>
                  </div>
                  <div className="info-group">
                    <h3>Joined At</h3>
                    <p>{new Date(selectedPlayer.timestamp).toLocaleString()}</p>
                  </div>
                  
                  {/* Manual qualification action */}
                  {selectedPlayer.status !== 'Qualified for Round 2' && (
                    <div className="manual-actions">
                      <button 
                        className="qualify-btn"
                        onClick={() => handleManuallyQualifyPlayer(selectedPlayer)}
                      >
                        Manually Qualify for Round 2
                      </button>
                    </div>
                  )}
                  
                  {/* Disqualify player action */}
                  <div className="manual-actions disqualify-actions">
                    <button 
                      className="disqualify-btn"
                      onClick={() => handleDisqualifyPlayer(selectedPlayer)}
                    >
                      Disqualify for Cheating
                    </button>
                  </div>
                  
                  {/* Real Link Location */}
                  {playerRealLink && (
                    <div className="real-link-location">
                      <h3>Real Link Location</h3>
                      <div className="real-link-details">
                        <p>
                          <strong>Page:</strong> {playerRealLink.page} | 
                          <strong>Section:</strong> {playerRealLink.section} | 
                          <strong>Position:</strong> {playerRealLink.position}
                        </p>
                        <p>
                          <strong>Link ID:</strong> {playerRealLink.linkId}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Admin;