import React, { useState, useEffect } from "react"
import AboutCard from "../about/AboutCard"
import Hblog from "./Hblog"
import HAbout from "./HAbout"
import Hero from "./hero/Hero"
import Hprice from "./Hprice"
import Testimonal from "./testimonal/Testimonal"
import "./NameModal.css"
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import io from 'socket.io-client'

// Function to get the API base URL
const getApiBaseUrl = () => {
  // Default to port 5000 if we can't read the file
  let port = 5000;
  
  try {
    // Try to read the port from localStorage (set by TreasureHunt or Admin components)
    const savedPort = localStorage.getItem('apiPort');
    if (savedPort) {
      port = savedPort;
    }
  } catch (error) {
    console.error('Error getting API port:', error);
  }
  
  return `http://localhost:${port}`;
};

const API_BASE_URL = getApiBaseUrl();

const Home = () => {
  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNameForm, setShowNameForm] = useState(false)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredName, setRegisteredName] = useState('')
  const [gameSettings, setGameSettings] = useState({ activeRound: 0 })
  const [gameStateLoading, setGameStateLoading] = useState(true)
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    // Check if there's a treasure hunt username in localStorage
    const savedUsername = localStorage.getItem('treasureHuntUsername')
    if (savedUsername) {
      setUsername(savedUsername)
      setRegisteredName(savedUsername)
      setRegistrationSuccess(true)
    }
    
    // Check current game state
    const fetchGameState = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/players/game-state`, {
          timeout: 5000
        });
        
        if (response.data.success) {
          setGameSettings(response.data.gameSettings);
        }
      } catch (error) {
        console.error('Error fetching game state:', error);
      } finally {
        setGameStateLoading(false);
      }
    };
    
    fetchGameState();
    
    // Set up socket connection for real-time game state updates
    const newSocket = io(API_BASE_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    setSocket(newSocket);
    
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
  }, [])

  const handleStartGame = async (e) => {
    e.preventDefault()
    
    // Validate username
    if (!username.trim()) {
      setUsernameError('Please enter your name to continue')
      return
    }
    
    if (username.trim().length < 2) {
      setUsernameError('Name must be at least 2 characters long')
      return
    }
    
    setUsernameError('')
    setIsLoading(true)
    
    // Generate player ID if it doesn't exist
    let playerId = localStorage.getItem('treasureHuntPlayerId')
    if (!playerId) {
      playerId = uuidv4()
      localStorage.setItem('treasureHuntPlayerId', playerId)
    }
    
    // Store username in localStorage
    localStorage.setItem('treasureHuntUsername', username)
    
    // Try to register player with backend
    let retryCount = 0;
    const maxRetries = 2;
    
    const attemptRegistration = async () => {
      try {
        // Register player with backend
        const response = await axios.post(`${API_BASE_URL}/api/players/register`, { 
          playerId,
          username: username 
        }, {
          timeout: 8000 // 8 second timeout
        })
        
        if (response.data.success) {
          // Show success message instead of redirecting
          setRegistrationSuccess(true)
          setRegisteredName(username)
          setShowNameForm(false)
        } else {
          throw new Error(response.data.message)
        }
      } catch (error) {
        console.error('Error registering player:', error)
        
        // Handle specific error types
        if (error.code === 'ECONNABORTED') {
          setUsernameError('Connection timed out. The server might be starting up. Please try again.')
        } else if (!error.response) {
          if (retryCount < maxRetries) {
            retryCount++;
            setUsernameError(`Network error. Retrying... (${retryCount}/${maxRetries})`)
            setTimeout(attemptRegistration, 2000); // Wait 2 seconds before retrying
            return;
          } else {
            setUsernameError('Network error. Please check that the backend server is running.')
          }
        } else {
          setUsernameError('Error registering player: ' + (error.response?.data?.message || error.message))
        }
        setIsLoading(false)
      }
    }
    
    await attemptRegistration();
  }

  const handleShowNameForm = () => {
    console.log('handleShowNameForm called - showing name form modal');
    setShowNameForm(true)
  }

  const handleCloseNameForm = () => {
    console.log('handleCloseNameForm called - hiding name form modal');
    setShowNameForm(false)
    setUsernameError('')
  }

  // Add a useEffect to log when showNameForm changes
  useEffect(() => {
    console.log('showNameForm state changed:', showNameForm);
  }, [showNameForm]);

  return (
    <>
      <Hero onTreasureHuntClick={handleShowNameForm} />
      
      {/* Game Status Message */}
      {!gameStateLoading && (
        <div className="game-status-container">
          <div className={`game-status-message round-${gameSettings.activeRound}`}>
            <h3>Game Status: {gameSettings.activeRound === 0 ? 'Not Started' : `Round ${gameSettings.activeRound} Active`}</h3>
            {gameSettings.activeRound === 0 ? (
              <p>The game has not been started by the administrator yet. You can register your name now, but you'll need to wait for the admin to start Round 1 before you can play.</p>
            ) : gameSettings.activeRound === 1 ? (
              <p>Round 1 is currently active! Register your name and start playing now!</p>
            ) : (
              <p>Round {gameSettings.activeRound} is currently active. Round 1 is no longer available.</p>
            )}
          </div>
        </div>
      )}
      
      {/* Test button to directly trigger the modal */}
      <div style={{ textAlign: 'center', margin: '20px 0' }}>
        <button 
          onClick={handleShowNameForm}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#ff5722', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          TEST: Open Name Form
        </button>
      </div>
      
      {/* Name Collection Form Modal */}
      {console.log('Modal should show:', showNameForm)}
      {(() => {
        try {
          return showNameForm && (
            <div 
              className="name-modal-overlay"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999
              }}
            >
              <div 
                className="name-modal"
                style={{
                  backgroundColor: 'white',
                  padding: '30px',
                  borderRadius: '10px',
                  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                  maxWidth: '500px',
                  width: '90%',
                  position: 'relative'
                }}
              >
                <button className="close-modal" onClick={handleCloseNameForm}>&times;</button>
                <h2>Welcome to the Treasure Hunt!</h2>
                <h3>Please Enter Your Name</h3>
                <p className="form-description">
                  Before you begin the treasure hunt, we need your name to identify you in the game.
                </p>
                
                {usernameError && <div className="error-message">{usernameError}</div>}
                
                <form onSubmit={handleStartGame}>
                  <div className="input-group">
                    <label htmlFor="username">Your Name:</label>
                    <input
                      type="text"
                      id="username"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value)
                        setUsernameError('')
                      }}
                      placeholder="Enter your name"
                      required
                      minLength="2"
                      maxLength="30"
                      autoFocus
                    />
                  </div>
                  
                  <div className="form-buttons">
                    <button 
                      type="submit"
                      disabled={isLoading || !username.trim()}
                      className="start-btn"
                    >
                      {isLoading ? 'Registering...' : 'Register'}
                    </button>
                    <button 
                      type="button"
                      className="cancel-btn"
                      onClick={handleCloseNameForm}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
                
                <div className="game-instructions">
                  <h4>Why we need your name:</h4>
                  <ul>
                    <li>To identify you on the admin dashboard</li>
                    <li>To track your progress through the game</li>
                    <li>To display on the leaderboard if you qualify for Round 2</li>
                    <li>Your name will only be visible to game administrators</li>
                  </ul>
                </div>
                
                {/* Game Status Message */}
                {!gameStateLoading && gameSettings.activeRound === 0 && (
                  <div className="game-status-note">
                    <p><strong>Note:</strong> The game has not been started by the administrator yet. You can register your name now, but you'll need to wait for the admin to start Round 1 before you can play.</p>
                  </div>
                )}
              </div>
            </div>
          );
        } catch (error) {
          console.error('Error rendering modal:', error);
          return <div style={{ color: 'red', padding: '20px', textAlign: 'center' }}>Error rendering modal: {error.message}</div>;
        }
      })()}
      
      {/* Success Message */}
      {registrationSuccess && (
        <div className="registration-success">
          <div className="success-content">
            <h2>Thank you, {registeredName}!</h2>
            <p>Your name has been registered successfully.</p>
            <p>You're now ready to participate in the treasure hunt.</p>
            {gameSettings.activeRound === 0 && (
              <div className="waiting-note">
                <p><strong>Please note:</strong> The game has not been started by the administrator yet. You'll need to wait for the admin to start Round 1 before you can play.</p>
              </div>
            )}
            <div className="admin-note">
              <strong>Note:</strong> Your name is now visible to the game administrator in the admin panel.
              This helps them track participation and manage the game experience.
            </div>
          </div>
        </div>
      )}
      
      <AboutCard />
      <HAbout />
      <Testimonal />
      <Hblog />
      <Hprice />
    </>
  )
}

export default Home

