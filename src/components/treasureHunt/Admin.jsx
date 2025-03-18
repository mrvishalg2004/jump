import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Admin.css';
import LinkTracker from './LinkTracker';
import { generateHash, getLinkLocations, getDecoyDestinations } from '../../utils/linkHider';

// Function to get the API base URL
const getApiBaseUrl = () => {
  // Default to port 5005 if we can't read the file
  let port = 5005;
  
  try {
    // Try to read the port from localStorage (set by other components)
    const savedPort = localStorage.getItem('apiPort');
    if (savedPort) {
      port = savedPort;
    }
    console.log(`Admin component using API port: ${port}`);
  } catch (error) {
    console.error('Error getting API port:', error);
  }
  
  return `http://localhost:${port}`;
};

const API_BASE_URL = getApiBaseUrl();

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
  
  // Connect to socket.io server
  useEffect(() => {
    if (authenticated) {
      const newSocket = io(API_BASE_URL, {
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      setSocket(newSocket);
      
      // Join admin room
      newSocket.emit('joinAdminRoom');
      
      // Listen for player updates
      newSocket.on('playerUpdate', (data) => {
        fetchPlayers();
      });

      // Listen for game state updates
      newSocket.on('gameStateUpdate', (data) => {
        setGameSettings(prevSettings => ({
          ...prevSettings,
          activeRound: data.activeRound
        }));
      });

      // Handle connection errors
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setError('Failed to connect to game server. Please check your connection.');
      });
      
      return () => {
        newSocket.disconnect();
      };
    }
  }, [authenticated]);

  // Fetch players data
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      console.log(`Fetching players from: ${API_BASE_URL}/api/players/admin/players`);
      
      const response = await axios.get(`${API_BASE_URL}/api/players/admin/players`, {
        timeout: 8000 // Increase timeout for more reliable connection
      });
      
      if (response.data.success) {
        setPlayers(response.data.players);
        setGameSettings(response.data.gameSettings);
        setError('');
        console.log(`Successfully fetched ${response.data.players.length} players`);
      } else {
        setError('Failed to fetch players data: ' + response.data.message);
        console.error('API returned error:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Request timed out. Please check your connection and try again.');
      } else if (!error.response) {
        setError(`Network error. Please check that the backend server is running on port ${localStorage.getItem('apiPort') || '5005'}.`);
      } else {
        setError('Failed to fetch players data: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Handle authentication
  const handleAuthentication = (e) => {
    e.preventDefault();
    
    // Check admin credentials
    if (password === 'vishalgolhar10@gmail.com#8421236102#7350168049' && 
        email === 'vishalgolhar10@gmail.com') {
      setAuthenticated(true);
      fetchPlayers();
      fetchOriginalLinkPosition();
    } else {
      setError('Invalid email or password');
    }
  };
  
  // Reset game
  const handleResetGame = async () => {
    if (window.confirm('Are you sure you want to reset the game? This will delete all player data.')) {
      try {
        setError(''); // Clear any previous errors
        const response = await axios.post(`${API_BASE_URL}/api/players/admin/reset`, {}, {
          timeout: 5000 // 5 second timeout
        });
        
        if (response.data.success) {
          await fetchPlayers(); // Refresh the player list
          alert('Game reset successfully');
          
          // Emit update to all admins
          if (socket && socket.connected) {
            socket.emit('playerUpdate', { action: 'reset' });
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
  const qualifiedPlayers = players
    .filter(player => player.status === 'Qualified for Round 2')
    .sort((a, b) => (a.timeTaken || Infinity) - (b.timeTaken || Infinity));
    
  // Calculate qualification statistics
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
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="admin-dashboard-header">
            <h1>Admin Dashboard</h1>
            
            <div className="quick-access-panel">
              <div className="quick-access-item">
                <h3>Hidden Links</h3>
                <p>View and manage all hidden links in the game</p>
                <a href="#hidden-links-section" className="quick-access-btn">
                  <span className="btn-icon">🔍</span>
                  Jump to Hidden Links
                </a>
              </div>
              
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
                <div className={`round-step ${gameSettings.activeRound >= 3 ? 'active' : ''}`}>
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
          
          {/* Hidden Links Tracker */}
          <div id="hidden-links-section" className="admin-section">
            <h2 className="section-title">
              <span className="section-icon">🔍</span>
              Hidden Links Tracker
              <span className="section-subtitle">View all possible link locations and player-specific links</span>
            </h2>
            <LinkTracker players={players} />
          </div>
          
          {/* Qualified Players Section */}
          <div id="qualified-players-section" className="admin-section">
            <h2 className="section-title">
              <span className="section-icon">🏆</span>
              Qualified Players
              <span className="section-subtitle">Players who have successfully found the hidden link</span>
            </h2>
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
            
            {qualifiedPlayers.length === 0 ? (
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
                {qualifiedPlayers.map((player, index) => (
                  <div key={player.playerId} className="qualified-player-row">
                    <div className="qualified-rank">{index + 1}</div>
                    <div className="qualified-name">{player.username}</div>
                    <div className="qualified-time">{(player.timeTaken / 1000).toFixed(2)}s</div>
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
                      <p>Time: {(selectedPlayer.timeTaken / 1000).toFixed(2)} seconds</p>
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