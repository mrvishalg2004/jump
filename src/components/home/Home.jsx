import React, { useState, useEffect } from "react"
import AboutCard from "../about/AboutCard"
import Hblog from "./Hblog"
import HAbout from "./HAbout"
import Hero from "./hero/Hero"
import Hprice from "./Hprice"
import Testimonal from "./testimonal/Testimonal"
import "./NameModal.css"
import './Home.css';
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import io from 'socket.io-client'
import { Link } from 'react-router-dom';
import { getApiBaseUrl, getSocketUrl } from '../../utils/apiConfig';

// Use the utility function for API base URL
const API_BASE_URL = getApiBaseUrl();
console.log('Using API Base URL:', API_BASE_URL);

// CSS Animations for the component
const animations = `
  @keyframes popLeft {
    0% { transform: translateY(-50%) translateX(-20px); opacity: 0; }
    100% { transform: translateY(-50%) translateX(0); opacity: 1; }
  }
  
  @keyframes popRight {
    0% { transform: translateY(-50%) translateX(20px); opacity: 0; }
    100% { transform: translateY(-50%) translateX(0); opacity: 1; }
  }
  
  @keyframes fall {
    0% { top: -10%; }
    100% { top: 100%; }
  }
  
  @keyframes firework1 {
    0% { top: 100%; opacity: 0; }
    50% { top: 0; opacity: 1; }
    100% { top: -20px; opacity: 0.7; }
  }
  
  @keyframes firework2 {
    0% { top: 100%; opacity: 0; }
    40% { top: 10%; opacity: 1; }
    100% { top: -20px; opacity: 0.7; }
  }
  
  @keyframes confettiFall {
    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(10deg); }
  }
  
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }
  
  @keyframes slideUp {
    0% { transform: translateY(50px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes countdown {
    0% { width: 100%; }
    100% { width: 0%; }
  }
`;

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
  const [inputLink, setInputLink] = useState('');
  const [token, setToken] = useState('');
  const [validationMessage, setValidationMessage] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [screenLocked, setScreenLocked] = useState(false);
  const [initialLockCheckDone, setInitialLockCheckDone] = useState(false);
  
  // Define maxRetries as a constant at component level
  const maxRetries = 3;

  useEffect(() => {
    // Set start time when component mounts
    if (!localStorage.getItem('treasureHuntStartTime')) {
      localStorage.setItem('treasureHuntStartTime', new Date().toISOString());
    }
    
    // Check if there's a treasure hunt username in localStorage
    const savedUsername = localStorage.getItem('treasureHuntUsername');
    if (savedUsername) {
      setUsername(savedUsername);
      setRegisteredName(savedUsername);
      setRegistrationSuccess(true);
    } else {
      // If no username is saved, show the name form immediately
      setShowNameForm(true);
    }
    
    // Check current game state
    const fetchGameState = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/players/game-state`, {
          timeout: 5000
        });
        
        if (response.data.success) {
          setGameSettings(response.data.gameSettings);
          
          // If user is registered but game hasn't started, lock the screen
          if (savedUsername && response.data.gameSettings.activeRound === 0) {
            console.log('User is registered but game not started - locking screen');
            setScreenLocked(true);
          } else if (savedUsername && response.data.gameSettings.activeRound > 0) {
            // Game is active, ensure screen is unlocked
            setScreenLocked(false);
          }
          
          // Mark initial lock check as done
          setInitialLockCheckDone(true);
        }
      } catch (error) {
        console.error('Error fetching game state:', error);
        
        // If we can't fetch game state but user is registered, check localStorage for lock state
        if (savedUsername) {
          const shouldBeLocked = localStorage.getItem('screenLocked') === 'true';
          if (shouldBeLocked) {
            console.log('Setting screen lock from localStorage');
            setScreenLocked(true);
          }
        }
        
        setInitialLockCheckDone(true);
      } finally {
        setGameStateLoading(false);
      }
    };
    
    fetchGameState();
    
    // Set up socket connection for real-time game state updates
    const socketUrl = getSocketUrl();
    console.log('Connecting to socket at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io'
    });
    
    setSocket(newSocket);
    
    // Listen for game state updates
    newSocket.on('gameStateUpdate', (data) => {
      console.log('Game state update received:', data);
      
      // Update game settings
      setGameSettings(prevSettings => ({
        ...prevSettings,
        activeRound: data.activeRound
      }));
      
      // Unlock screen when game starts (Round 1 activated)
      if (data.activeRound >= 1) {
        console.log('Game started, unlocking screen');
        setScreenLocked(false);
        localStorage.setItem('screenLocked', 'false');
      } else {
        // If game is set back to inactive, lock the screen again
        if (registrationSuccess) {
          console.log('Game inactive, locking screen');
          setScreenLocked(true);
          localStorage.setItem('screenLocked', 'true');
        }
      }
    });
    
    // Listen for game reset events
    newSocket.on('gameReset', () => {
      // Alert the user first before refresh
      alert('The game has been reset. Please register again to continue.');
      
      // Immediately reset registration state
      setRegistrationSuccess(false);
      setRegisteredName('');
      setUsername('');
      setShowNameForm(true);
      
      // Clear player registration data from localStorage
      localStorage.removeItem('treasureHuntUsername');
      localStorage.removeItem('treasureHuntPlayerId');
      localStorage.removeItem('treasureHuntStartTime');
      
      // Force refresh the page to clear all state
      window.location.reload();
    });
    
    // Listen for player disqualification
    newSocket.on('playerDisqualified', (data) => {
      console.log('Received disqualification event:', data);
      const currentPlayerId = localStorage.getItem('treasureHuntPlayerId');
      
      // Check if this disqualification is for the current player
      if (data.playerId === currentPlayerId) {
        console.log('Current player disqualified, freezing screen');
        
        // Create and show the disqualification overlay
        const overlay = document.createElement('div');
        overlay.id = 'disqualification-overlay';
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.9);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
          font-family: Arial, sans-serif;
        `;
        
        overlay.innerHTML = `
          <div style="text-align: center; padding: 20px;">
            <h1 style="color: #ff4444; font-size: 2.5em; margin-bottom: 20px;">YOU HAVE BEEN DISQUALIFIED</h1>
            <p style="font-size: 1.2em; margin-bottom: 15px;">Reason: Cheating detected</p>
            <p style="font-size: 1.1em; margin-bottom: 20px;">Your game session has been terminated.</p>
            <p style="font-size: 1em; color: #ff8888;">Please contact the organizers for more information.</p>
          </div>
        `;
        
        // Add the overlay to the page
        document.body.appendChild(overlay);
        
        // Disable all inputs and buttons
        const allInputs = document.querySelectorAll('input, button, a');
        allInputs.forEach(input => {
          input.style.pointerEvents = 'none';
        });
        
        // Prevent any interaction with the page
        document.body.style.overflow = 'hidden';
        document.body.style.userSelect = 'none';
        
        // Clear player data
        localStorage.removeItem('treasureHuntPlayerId');
        localStorage.removeItem('treasureHuntUsername');
        
        // Reset the application state
        setUsername('');
        setRegisteredName('');
        setRegistrationSuccess(false);
        setShowNameForm(true);
        
        // Force reload after 5 seconds
        setTimeout(() => {
          window.location.reload();
        }, 5000);
      }
    });
    
    // Listen for game start event
    newSocket.on('gameStarted', () => {
      console.log('Game started event received');
      setScreenLocked(false);
      localStorage.setItem('screenLocked', 'false');
      
      // Bonus: Show a quick notification or animation to indicate the game has started
      const startNotification = document.createElement('div');
      startNotification.className = 'game-start-notification';
      startNotification.innerHTML = `
        <div class="notification-content">
          <h3>Game Has Started!</h3>
          <p>Round 1 is now active. Good luck!</p>
        </div>
      `;
      document.body.appendChild(startNotification);
      
      // Remove the notification after a few seconds
      setTimeout(() => {
        if (startNotification.parentNode) {
          startNotification.parentNode.removeChild(startNotification);
        }
      }, 5000);
    });
    
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      newSocket.off('gameStarted');
    };
  }, []);

  // Add an effect to save lock state to localStorage when it changes
  useEffect(() => {
    if (initialLockCheckDone) {
      localStorage.setItem('screenLocked', screenLocked ? 'true' : 'false');
      console.log('Screen lock state saved to localStorage:', screenLocked);
    }
  }, [screenLocked, initialLockCheckDone]);

  // Handle name form submission
  const handleNameSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!username.trim()) {
      setUsernameError('Please enter your name');
      return;
    }
    
    if (username.trim().length < 2) {
      setUsernameError('Name must be at least 2 characters long');
      return;
    }
    
    setUsernameError('');
    setIsLoading(true);
    
    // Mark registration as in progress
    localStorage.setItem('registrationInProgress', 'true');
    
    // Generate a unique player ID if not existing
    const playerId = localStorage.getItem('treasureHuntPlayerId') || uuidv4();
    
    const apiUrl = `${API_BASE_URL}/api/players/register`;
    console.log(`Registering player at: ${apiUrl}`, { playerId, username });
    
    let retryCount = 0;
    
    const attemptRegistration = async () => {
      try {
        console.log(`Attempt ${retryCount + 1}/${maxRetries} to register at ${apiUrl}`);
        
        // Add a small delay before sending the request to avoid rate limiting
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const response = await axios.post(apiUrl, {
          playerId,
          username
        }, {
          timeout: 10000 // Increase timeout for reliability
        });
        
        if (response.data.success) {
          console.log('Registration successful:', response.data);
          
          // Save player info to localStorage
          localStorage.setItem('treasureHuntPlayerId', playerId);
          localStorage.setItem('treasureHuntUsername', username);
          localStorage.removeItem('registrationInProgress');
          
          // Update component state
          setRegisteredName(username);
          setRegistrationSuccess(true);
          setShowNameForm(false);
          setRetrying(false);
          
          // Check game state and freeze screen if game hasn't started
          if (gameSettings.activeRound === 0) {
            console.log('Locking screen after registration since game has not started');
            setScreenLocked(true);
            // Persist lock state to localStorage
            localStorage.setItem('screenLocked', 'true');
          } else {
            // Game has started, ensure screen is unlocked
            setScreenLocked(false);
            localStorage.setItem('screenLocked', 'false');
          }
          
          return {
            success: true,
            gameStarted: gameSettings.activeRound > 0
          };
        } else {
          throw new Error(response.data.message || 'Registration failed');
        }
      } catch (error) {
        console.error('Registration error:', error);
        
        // Increment the retry count for the next attempt
        const currentRetries = retryCount + 1;
        setRetryCount(currentRetries);
        
        if (currentRetries < maxRetries) {
          setRetrying(true);
          console.log(`Retrying registration (${currentRetries}/${maxRetries})...`);
          
          // Try again after a delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          return attemptRegistration();
        }
        
        // Update the UI to show we're not retrying anymore
        setRetrying(false);
        
        // Handle specific deployment errors
        if (process.env.NODE_ENV === 'production') {
          // In production, inform user about connectivity issues
          setUsernameError('Unable to connect to the server. Please try again later.');
          localStorage.removeItem('registrationInProgress');
          setIsLoading(false);
          return { success: false };
        }
        
        // Try alternative port as last resort (development only)
        if (!error.response && currentRetries >= maxRetries) {
          try {
            console.log('Trying alternative port...');
            const currentPort = parseInt(API_BASE_URL.split(':')[2]);
            const altPort = currentPort === 5001 ? 5000 : 5001; // Try alternate port
            
            const altApiUrl = `http://localhost:${altPort}/api/players/register`;
            console.log(`Trying alternative registration endpoint: ${altApiUrl}`);
            
            const altResponse = await axios.post(altApiUrl, {
              playerId,
              username
            }, {
              timeout: 5000
            });
            
            if (altResponse.data.success) {
              // Update port for future requests
              localStorage.setItem('apiPort', altPort.toString());
              
              // Save player info
              localStorage.setItem('treasureHuntPlayerId', playerId);
              localStorage.setItem('treasureHuntUsername', username);
              
              // Update component state
              setRegisteredName(username);
              setRegistrationSuccess(true);
              setShowNameForm(false);
              return { success: true };
            }
          } catch (altError) {
            console.error('Alternative registration failed:', altError);
          }
        }
        
        // All attempts failed
        if (error.response) {
          setUsernameError(`Server error: ${error.response.data?.message || 'Registration failed'}`);
        } else if (error.request) {
          setUsernameError('Network error. Please check your connection and try again.');
        } else {
          setUsernameError(error.message || 'Something went wrong. Please try again.');
        }
        
        localStorage.removeItem('registrationInProgress');
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    };
    
    try {
      const response = await attemptRegistration();
      if (response.success) {
        setShowNameForm(false);
        // Lock the screen if game hasn't started
        if (!response.gameStarted) {
          setScreenLocked(true);
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setUsernameError('Failed to register. Please try again.');
    }
  };

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

  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    
    // Basic input validation
    const cleanedInput = inputLink.trim();
    if (!cleanedInput) {
      alert('Please enter a link');
      return;
    }
    
    // Make sure the link starts with /
    const formattedLink = cleanedInput.startsWith('/') ? cleanedInput : `/${cleanedInput}`;
    
    // Check for saved username
    const savedUsername = localStorage.getItem('treasureHuntUsername');
    if (!savedUsername) {
      alert('Please register your name to participate.');
      handleShowNameForm();
      return;
    }
    
    // Define the array of correct links
    const correctLinks = [
      '/roundtwo-a1b2c3d4e5f6789',
      '/roundtwo-ff774ffhhi287',
      '/roundtwo-x9y8z7w6v5u4321',
      '/roundtwo-mn34op56qr78st90',
      '/roundtwo-abcd1234efgh5678',
      '/roundtwo-xyz987uvw654rst3',
      '/roundtwo-qwerty123uiop456',
      '/roundtwo-lmn678opq234rst9',
      '/roundtwo-98zyx765wvu43210',
      '/roundtwo-ghijklm456nop789',
      '/roundtwo-pqrstu123vwxyz45',
      '/roundtwo-abc987def654ghi32',
      '/roundtwo-klmno123pqrst456',
      '/roundtwo-uvwxyz9876543210',
      '/roundtwo-qwert678yuiop234'
    ];
    
    // Check if the link is valid (either exact match or case-insensitive)
    const isExactMatch = correctLinks.includes(formattedLink);
    const isCaseInsensitiveMatch = correctLinks.some(
      link => link.toLowerCase() === formattedLink.toLowerCase()
    );
    
    // Check if the link is valid using multiple approaches
    const isValidLink = isExactMatch || isCaseInsensitiveMatch || formattedLink.toLowerCase().startsWith('/roundtwo-');
    
    // If the link is not valid, show an error message
    if (!isValidLink) {
      alert('Invalid link. Please try again with a correct link.');
      return;
    }
    
    // Show loading indicator
    setIsLoading(true);
    
    try {
      // IMPORTANT: Always create a fresh player ID for each submission
      // This avoids database consistency issues
      const playerId = uuidv4();
      localStorage.setItem('treasureHuntPlayerId', playerId);
      
      // Step 1: Register the player and wait for response
      console.log('Registering player:', playerId, savedUsername);
      const registerResponse = await axios.post(`${API_BASE_URL}/api/players/register`, {
        playerId,
        username: savedUsername
      });
      
      if (!registerResponse.data.success) {
        throw new Error('Registration failed: ' + registerResponse.data.message);
      }
      
      console.log('Registration successful:', registerResponse.data);
      
      // Step 2: Add a deliberate delay to ensure the database has processed the registration
      console.log('Waiting for database to process registration...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Now qualify the player using the SAME player ID from registration
      console.log('Qualifying player with valid link:', formattedLink);
      const qualifyResponse = await axios.post(`${API_BASE_URL}/api/players/direct-qualify`, {
        playerId,
        username: savedUsername,  // Include username as backup
        clickedLink: formattedLink
      });
      
      console.log('Qualification response:', qualifyResponse.data);
      
      // Handle successful qualification
      if (qualifyResponse.data && qualifyResponse.data.success) {
        setInputLink('');
        alert(`Congratulations ${savedUsername}! You have qualified for Round Two!`);
        setRegistrationSuccess(true);
        setRegisteredName(savedUsername);
      } else {
        alert(qualifyResponse.data.message || 'Server responded but could not qualify you. Please try again.');
      }
    } catch (error) {
      console.error('Error during qualification process:', error);
      
      if (error.response?.status === 403) {
        alert('Round 1 is not currently active. Please wait for the admin to start the round.');
      } else if (error.response?.status === 404) {
        // Try the force-qualify endpoint as last resort
        try {
          const fallbackId = localStorage.getItem('treasureHuntPlayerId');
          console.log('Trying force-qualify as fallback with ID:', fallbackId);
          
          const fallbackResponse = await axios.post(`${API_BASE_URL}/api/players/force-qualify`, {
            playerId: fallbackId,
            username: savedUsername
          });
          
          if (fallbackResponse.data.success) {
            setInputLink('');
            alert(`Congratulations ${savedUsername}! You have qualified for Round Two!`);
            setRegistrationSuccess(true);
            setRegisteredName(savedUsername);
          } else {
            alert('Your player record could not be found. Please refresh the page and try again.');
          }
        } catch (fallbackError) {
          console.error('Fallback qualification failed:', fallbackError);
          alert('Your player record could not be found. Please refresh the page and try again.');
        }
      } else if (!error.response) {
        alert('Cannot connect to the server. Please check your internet connection and try again.');
      } else {
        alert('There was a problem with your submission. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle link submission form with simplified validation
  const handleSimpleLinkCheck = async (e) => {
    e.preventDefault();
    
    // Basic input validation
    const cleanedInput = inputLink.trim();
    if (!cleanedInput) {
      alert('Please enter a link');
      return;
    }
    
    // Make sure the link starts with /
    const formattedLink = cleanedInput.startsWith('/') ? cleanedInput : `/${cleanedInput}`;
    
    // Define the array of correct links
    const correctLinks = [
      '/roundtwo-a1b2c3d4e5f6789',
      '/roundtwo-ff774ffhhi287',
      '/roundtwo-x9y8z7w6v5u4321',
      '/roundtwo-mn34op56qr78st90',
      '/roundtwo-abcd1234efgh5678',
      '/roundtwo-xyz987uvw654rst3',
      '/roundtwo-qwerty123uiop456',
      '/roundtwo-lmn678opq234rst9',
      '/roundtwo-98zyx765wvu43210',
      '/roundtwo-ghijklm456nop789',
      '/roundtwo-pqrstu123vwxyz45',
      '/roundtwo-abc987def654ghi32',
      '/roundtwo-klmno123pqrst456',
      '/roundtwo-uvwxyz9876543210',
      '/roundtwo-qwert678yuiop234'
    ];
    
    // Check if the link is valid (either exact match or case-insensitive)
    const isExactMatch = correctLinks.includes(formattedLink);
    const isCaseInsensitiveMatch = correctLinks.some(
      link => link.toLowerCase() === formattedLink.toLowerCase()
    );
    
    // Check if the link is valid using multiple approaches
    const isValidLink = isExactMatch || isCaseInsensitiveMatch;
    
    // Disable input and button during validation
    setIsLoading(true);
    
    // Show appropriate message based on validation
    if (isValidLink) {
      setValidationMessage({ 
        isValid: true, 
        message: "Congratulations you are selected for round 2",
        showAnimation: true 
      });
      
      // Get playerId and username from localStorage
      const playerId = localStorage.getItem('treasureHuntPlayerId');
      const savedUsername = localStorage.getItem('treasureHuntUsername');
      
      // Enable input/button immediately for valid links
      setIsLoading(false);
      
      // Notify the backend about the successful qualification to update admin panel
      if (playerId && savedUsername) {
        // Try to qualify the player using the backend API
        (async () => {
          try {
            const qualifyResponse = await axios.post(`${API_BASE_URL}/api/players/direct-qualify`, {
              playerId,
              username: savedUsername,
              clickedLink: formattedLink,
              timeTaken: calculateTimeTaken()
            });
            
            console.log('Player qualified via direct-qualify:', qualifyResponse.data);
            
            // Update registration status
            setRegistrationSuccess(true);
            setRegisteredName(savedUsername);
            
            // Send socket event to update admin panel in real-time
            if (socket) {
              socket.emit('playerQualified', {
                playerId,
                username: savedUsername,
                status: 'Qualified for Round 2'
              });
            }
          } catch (error) {
            console.error('Error qualifying player:', error);
            // Still show the success message to the user even if there's a backend error
          }
        })();
      }
    } else {
      // For invalid links, show error message and freeze for 5 seconds
      setValidationMessage({ 
        isValid: false, 
        message: "Invalid link. Please try again with a correct link.",
        showAnimation: false
      });
      
      // Create a countdown timer in the message
      let timeLeft = 5;
      
      // Update message with countdown
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        
        if (timeLeft <= 0) {
          // When countdown reaches 0, clear the interval and enable input/button
          clearInterval(countdownInterval);
          setIsLoading(false);
          // Reset validation message after the timer ends
          setTimeout(() => {
            setValidationMessage(null);
          }, 200);
        } else {
          setValidationMessage({
            isValid: false,
            message: `Invalid link. Please try again with a correct link. (${timeLeft}s)`,
            showAnimation: false
          });
        }
      }, 1000);
      
      // Safety fallback - ensure we unfreeze even if something goes wrong with the interval
      setTimeout(() => {
        clearInterval(countdownInterval);
        setIsLoading(false);
        setValidationMessage(null);
      }, 5500);
    }
  };

  // Helper function to calculate time taken
  const calculateTimeTaken = () => {
    const startTimeStr = localStorage.getItem('treasureHuntStartTime');
    if (!startTimeStr) return 0;
    
    try {
      const startTime = new Date(startTimeStr).getTime();
      const endTime = new Date().getTime();
      return Math.floor((endTime - startTime) / 1000); // Time in seconds
    } catch (error) {
      console.error('Error calculating time taken:', error);
      return 0;
    }
  };

  return (
    <>
      {/* CSS Animations */}
      <style jsx="true">{animations}</style>
      
      <Hero onTreasureHuntClick={handleShowNameForm} />
      
      {/* Simple Link Validation Form */}
      <div className="link-validation-container" style={{ margin: '20px auto', maxWidth: '600px', textAlign: 'center' }}>
        <h3>Validate your link</h3>
        <form onSubmit={handleSimpleLinkCheck} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            value={inputLink}
            onChange={(e) => {
              setInputLink(e.target.value);
              setValidationMessage(null); // Clear message when input changes
            }}
            placeholder="Paste your found link here"
            required
            disabled={isLoading}
            style={{ 
              padding: '10px', 
              fontSize: '16px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              backgroundColor: isLoading ? '#f5f5f5' : 'white',
              cursor: isLoading ? 'not-allowed' : 'text'
            }}
          />
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              padding: '10px 20px', 
              fontSize: '16px', 
              backgroundColor: isLoading ? '#cccccc' : '#4CAF50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s'
            }}
          >
            {isLoading ? 'Please wait...' : 'Check Link'}
          </button>
        </form>
        
        {/* Display validation message with animation */}
        {validationMessage && (
          <>
            {/* Regular error message for invalid links with full-screen freeze overlay */}
            {!validationMessage.isValid && (
              <>
                {/* Error message */}
                <div 
                  style={{ 
                    marginTop: '15px', 
                    padding: '10px', 
                    borderRadius: '4px',
                    backgroundColor: '#FFBABA',
                    color: '#D8000C',
                    fontWeight: 'bold'
                  }}
                >
                  {validationMessage.message}
                </div>
                
                {/* Full-screen freeze overlay */}
                <div 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(5px)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9998, // Just below celebratory overlay
                    cursor: 'not-allowed'
                  }}
                >
                  <div style={{
                    backgroundColor: '#FFBABA',
                    color: '#D8000C',
                    padding: '20px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    maxWidth: '80%',
                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)'
                  }}>
                    <h2 style={{ margin: '0 0 10px 0' }}>Invalid Link</h2>
                    <p style={{ fontSize: '18px', margin: '10px 0 20px 0' }}>
                      {validationMessage.message}
                    </p>
                    <div style={{ 
                      width: '100%', 
                      height: '4px', 
                      backgroundColor: '#D8000C',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: '100%',
                        width: '100%',
                        backgroundColor: 'white',
                        animation: 'countdown 5s linear forwards'
                      }}></div>
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* Full-screen celebration for valid links */}
            {validationMessage.isValid && validationMessage.showAnimation && (
              <div 
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 9999,
                  overflow: 'hidden'
                }}
              >
                {/* Large congratulation message */}
                <div 
                  style={{
                    fontSize: '42px',
                    fontWeight: 'bold',
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: '40px',
                    animation: 'pulse 2s infinite',
                    textShadow: '0 0 10px #ffcc00, 0 0 20px #ffcc00, 0 0 30px #ffcc00'
                  }}
                >
                  🎉 CONGRATULATIONS! 🎉
                </div>
                
                <div 
                  style={{
                    fontSize: '28px',
                    color: '#fff',
                    textAlign: 'center',
                    marginBottom: '30px',
                    animation: 'slideUp 1s ease-out'
                  }}
                >
                  You are selected for Round 2!
                </div>
                
                {/* Close button */}
                <button
                  onClick={() => setValidationMessage(null)}
                  style={{
                    marginTop: '40px',
                    padding: '12px 30px',
                    fontSize: '18px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '30px',
                    cursor: 'pointer',
                    animation: 'bounce 1s infinite',
                    boxShadow: '0 0 20px #4CAF50'
                  }}
                >
                  Continue
                </button>
                
                {/* Confetti animation across entire screen */}
                {Array.from({ length: 100 }).map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: `hsl(${Math.random() * 360}, 90%, 70%)`,
                    width: `${Math.random() * 15 + 5}px`,
                    height: `${Math.random() * 15 + 5}px`,
                    borderRadius: '2px',
                    zIndex: -1,
                    animation: `confettiFall ${2 + Math.random() * 6}s linear infinite`,
                    animationDelay: `${Math.random() * 5}s`,
                    transform: `rotate(${Math.random() * 360}deg)`
                  }}></div>
                ))}
                
                {/* Party emojis */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={`emoji-${i}`} style={{
                    position: 'absolute',
                    left: `${Math.random() * 90 + 5}%`,
                    top: `${Math.random() * 90 + 5}%`,
                    fontSize: `${Math.random() * 30 + 20}px`,
                    animation: `float ${3 + Math.random() * 7}s ease-in-out infinite`,
                    animationDelay: `${Math.random() * 5}s`,
                    opacity: 0.9,
                    zIndex: 1
                  }}>
                    {['🎉', '🎊', '🎈', '🎆', '✨', '🏆'][Math.floor(Math.random() * 6)]}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Game Status Message */}
      {!gameStateLoading && (
        <div className="game-status-container">
          <div className={`game-status-message round-${gameSettings.activeRound}`}>
            <h3>
              {gameSettings.activeRound === 0 && 'Game Not Started Yet'}
              {gameSettings.activeRound === 1 && 'Round 1 is Active!'}
              {gameSettings.activeRound === 2 && 'Round 2 is Active!'}
              {gameSettings.activeRound === 3 && 'Final Round is Active!'}
            </h3>
            <p>
              {gameSettings.activeRound === 0 && 'Please wait for the admin to start Round 1.'}
              {gameSettings.activeRound === 1 && 'Round 1 is currently active. Find the hidden links on the Treasure Hunt page to qualify for Round 2!'}
              {gameSettings.activeRound === 2 && 'Round 2 is active. If you qualified, you can now participate in the second round!'}
              {gameSettings.activeRound === 3 && 'The final round is active! Good luck to all participants.'}
            </p>
            {gameSettings.activeRound === 0 && (
              <div className="waiting-note">
                <p>The game has not started yet. Please check back later or wait for an announcement.</p>
              </div>
            )}
            {registrationSuccess && gameSettings.activeRound === 1 && (
              <div className="game-status-note">
                <p>You are registered as: <strong>{registeredName}</strong>. Head to the Treasure Hunt page to start playing!</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Display registration success message */}
      {registrationSuccess && (
        <div className="registration-success">
          <div className="success-content">
            <h2>Registration Successful!</h2>
            <p>Welcome, <strong>{registeredName}</strong>! You are now registered for the treasure hunt.</p>
            <p>When Round 1 is active, you can start playing by clicking on the "Treasure Hunt" link in the navigation bar.</p>
            <div className="admin-note">
              <p>Note: The admin must activate Round 1 before you can start playing.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Name registration modal */}
      {showNameForm && (
        <div className="name-modal-overlay">
          <div className="name-modal">
            <span className="close-button" onClick={handleCloseNameForm}>&times;</span>
            <h2>Enter Your Name</h2>
            <form onSubmit={handleNameSubmit} className="name-form">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your name"
                maxLength={20}
                disabled={isLoading}
                autoFocus
              />
              {usernameError && <div className="error-message">{usernameError}</div>}
              <button type="submit" disabled={isLoading || retrying}>
                {isLoading ? (
                  retrying ? 
                  `Retrying... (${retryCount}/${maxRetries})` : 
                  'Registering...'
                ) : 'Start Game'}
              </button>
            </form>
          </div>
        </div>
      )}
      
      {screenLocked && (
        <div className="screen-lock-overlay">
          <div className="lock-message">
            <h2>Registration Complete!</h2>
            <div className="lock-icon">🔒</div>
            <p>Welcome, <strong>{registeredName}</strong>!</p>
            <p>Please wait for the admin to start Round 1.</p>
            <p className="waiting-message">Your screen will unlock automatically when the game begins.</p>
            
            <div className="loading-animation">
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
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