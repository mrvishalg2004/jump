import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './TreasureHunt.css';
import TextWithHiddenLinks from './TextWithHiddenLinks';
import './TextWithHiddenLinks.css';
import HiddenLink from './HiddenLink';
import { getPageLinks } from '../../utils/linkHider';

// Function to get the API base URL
const getApiBaseUrl = () => {
  // Default to port 5000 if we can't read the file
  let port = 5000;
  
  try {
    // Try to read the port from localStorage (set by other components)
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

// Educational content about online learning with hidden links
const educationalContent = [
  {
    title: "Benefits of Online Learning",
    text: "Online Learning offers flexibility and accessibility for students worldwide. The digital education landscape continues to evolve with innovative teaching methods. Learning at your own pace is one of the key advantages of virtual classrooms. Expertise in various subjects is now available to anyone with an internet connection. Artificial Intelligence is transforming how we acquire knowledge in the modern era.",
    page: "about",
    realLinkWords: ["Artificial Intelligence"],
    decoyLinkWords: ["Online", "digital", "virtual", "Expertise", "Learning", "flexibility", "accessibility", "innovative"]
  },
  {
    title: "The Future of Education",
    text: "Education is transforming rapidly in the digital age. Technology enables personalized learning experiences for students of all backgrounds. Interactive content makes complex subjects more engaging and accessible. Knowledge acquisition has never been more convenient or adaptable to individual needs. Computational thinking helps develop problem-solving skills essential for future careers.",
    page: "contact",
    realLinkWords: ["Computational thinking"],
    decoyLinkWords: ["Education", "Technology", "Interactive", "personalized", "Knowledge", "problem-solving", "careers", "digital"]
  },
  {
    title: "Effective Study Techniques",
    text: "Developing good study habits is essential for academic success. Research shows that spaced repetition improves long-term retention of information. Practice tests are more effective than simply rereading material. Understanding core concepts is more valuable than memorizing facts without context. Collaborative learning environments foster deeper engagement with complex material.",
    page: "home",
    realLinkWords: ["Understanding core concepts"],
    decoyLinkWords: ["Developing", "Research", "Practice", "memorizing", "Collaborative", "learning", "engagement", "complex", "retention"]
  }
];

// Hidden elements with links
const hiddenElements = [
  // Buttons
  { type: 'button', text: 'Explore Resources', page: 'about', isReal: true },
  { type: 'button', text: 'Join Community', page: 'contact', isReal: false },
  { type: 'button', text: 'Start Learning', page: 'home', isReal: false }
];

const TreasureHunt = () => {
  const [playerId, setPlayerId] = useState('');
  const [username, setUsername] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [penalty, setPenalty] = useState(false);
  const [penaltyTime, setPenaltyTime] = useState(0);
  const [randomPosition, setRandomPosition] = useState({ top: 0, left: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [gameActive, setGameActive] = useState(false);
  const [activeRound, setActiveRound] = useState(0);
  const [socket, setSocket] = useState(null);
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const history = useHistory();

  // Initialize player data and check game state on component mount
  useEffect(() => {
    const initializePlayer = async () => {
      setLoading(true);
      
      // Get player ID and username from localStorage
      const savedPlayerId = localStorage.getItem('treasureHuntPlayerId');
      const savedUsername = localStorage.getItem('treasureHuntUsername');
      
      // If no player ID or username, redirect to home page
      if (!savedPlayerId || !savedUsername) {
        setError('Please register your name on the home page before starting the treasure hunt.');
        setTimeout(() => {
          history.push('/');
        }, 3000);
        return;
      }
      
      setPlayerId(savedPlayerId);
      setUsername(savedUsername);
      
      try {
        // Check if the game is active
        const response = await axios.get(`${API_BASE_URL}/api/players/game-state`, {
          timeout: 5000
        });
        
        if (response.data.success) {
          const { gameSettings } = response.data;
          setActiveRound(gameSettings.activeRound);
          setGameActive(gameSettings.activeRound === 1);
          
          if (gameSettings.activeRound === 1) {
            // Game is active, start the timer
            setStartTime(Date.now());
            // Add hidden console message - MEDIUM DIFFICULTY: More helpful console message
            console.log("%c TREASURE HUNT HINT ", "background: #1eb2a6; color: white; font-size: 14px; padding: 5px;");
            console.log("%c Look for special words in the educational content. Words like 'Learning', 'Knowledge', and 'Understanding' might be important! ", "color: #1eb2a6; font-size: 12px;");
            // Randomize hidden link position
            randomizePosition();
          }
        }
      } catch (error) {
        console.error('Error checking game state:', error);
        setError('Error connecting to the game server. Please try again later.');
      }
      
      setLoading(false);
    };
    
    initializePlayer();
    
    // Set up socket connection for real-time game state updates
    const newSocket = io(API_BASE_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    setSocket(newSocket);
    
    // Listen for game state updates
    newSocket.on('gameStateUpdate', (data) => {
      setActiveRound(data.activeRound);
      setGameActive(data.activeRound === 1);
      
      if (data.activeRound === 1 && !startTime) {
        // Game just became active, start the timer
        setStartTime(Date.now());
        // Add hidden console message - MEDIUM DIFFICULTY: More helpful console message
        console.log("%c TREASURE HUNT HINT ", "background: #1eb2a6; color: white; font-size: 14px; padding: 5px;");
        console.log("%c Look for special words in the educational content. Words like 'Learning', 'Knowledge', and 'Understanding' might be important! ", "color: #1eb2a6; font-size: 12px;");
        // Randomize hidden link position
        randomizePosition();
      }
    });
    
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [history, startTime]);
  
  // Randomize the position of the hidden link
  const randomizePosition = () => {
    const top = Math.floor(Math.random() * 80) + 10; // 10-90%
    const left = Math.floor(Math.random() * 80) + 10; // 10-90%
    setRandomPosition({ top, left });
  };
  
  // Handle wrong link clicks
  const handleWrongClick = async (linkId) => {
    if (penalty) return; // Already in penalty
    
    setPenalty(true);
    setPenaltyTime(5);
    
    // Track the wrong click in the backend
    try {
      await axios.post(`${API_BASE_URL}/api/players/track-link-click`, {
        playerId,
        linkId: linkId || 'unknown-link',
        isCorrect: false
      });
      
      // Update socket with player attempt
      if (socket) {
        socket.emit('playerUpdate', {
          playerId,
          username,
          action: 'wrong_link',
          timestamp: new Date().toISOString(),
          message: `${username} clicked a wrong link`
        });
      }
    } catch (error) {
      console.error('Error tracking link click:', error);
    }
    
    // Start countdown
    const interval = setInterval(() => {
      setPenaltyTime(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setPenalty(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Handle correct link click
  const handleCorrectClick = async (e) => {
    e.preventDefault();
    
    if (penalty) return; // Can't click during penalty
    if (!gameActive) return; // Game is not active
    
    const timeTaken = Date.now() - startTime;
    
    try {
      // Show immediate congratulatory message
      setShowCongratulations(true);
      
      const response = await axios.post(`${API_BASE_URL}/api/players/submit-link`, {
        playerId,
        clickedLink: '/treasureHunt/round2',
        timeTaken
      }, {
        timeout: 5000 // 5 second timeout
      });
      
      if (response.data.success) {
        if (response.data.qualified) {
          // Update socket with player progress
          if (socket) {
            socket.emit('playerUpdate', {
              playerId,
              username,
              action: 'found_link',
              timestamp: new Date().toISOString(),
              message: `${username} found the hidden link to Round Two!`
            });
          }
          
          // Wait 3 seconds to show the congratulations message before redirecting
          setTimeout(() => {
            // Redirect to Round 2
            history.push('/treasureHunt/round2');
          }, 3000);
        } else {
          // Show detailed failure message
          const message = response.data.message || 'You found the correct link, but all 15 qualification spots have been filled.';
          const currentRank = response.data.rank || 'unknown';
          
          setShowCongratulations(false);
          alert(`${message}\n\nYour position: ${currentRank}\n\nThank you for participating in the treasure hunt!`);
        }
      } else {
        setShowCongratulations(false);
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error('Error submitting link:', error);
      setShowCongratulations(false);
      
      if (error.code === 'ECONNABORTED') {
        alert('Connection timed out. Please try again.');
      } else if (!error.response) {
        alert('Network error. Please check your connection and try again.');
      } else {
        alert('Error submitting link: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  // Add console hints when game becomes active
  useEffect(() => {
    if (gameActive) {
      setStartTime(Date.now());
      
      // Add console hints for players
      console.log(
        '%c TREASURE HUNT CHALLENGE ',
        'background: #e74c3c; color: white; font-size: 14px; padding: 5px; border-radius: 4px;'
      );
      
      console.log(
        '%c COMPETITION ALERT: Only the first 15 players will qualify for Round 2! ',
        'background: #f39c12; color: white; font-size: 12px; padding: 3px; border-radius: 3px;'
      );
      
      console.log(
        '%c HINT: Look for hidden links in various elements: ',
        'color: #3498db; font-weight: bold; font-size: 12px;'
      );
      
      console.log(
        '%c 1. Special words in the educational content (Learning, Knowledge, Understanding) ',
        'color: #2ecc71; font-size: 12px;'
      );
      
      console.log(
        '%c 2. Icons like 🎓 might be clickable ',
        'color: #2ecc71; font-size: 12px;'
      );
      
      console.log(
        '%c 3. Some images, buttons, or logos could lead to Round 2 ',
        'color: #2ecc71; font-size: 12px;'
      );
      
      console.log(
        '%c Real links have subtle visual differences when you hover over them! ',
        'color: #e74c3c; font-style: italic; font-size: 12px;'
      );
    }
  }, [gameActive]);

  // If loading, show loading message
  if (loading) {
    return (
      <div className="loading-container">
        <h2>Loading treasure hunt...</h2>
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="error-container">
        <h2>{error}</h2>
        <p>Redirecting to home page...</p>
      </div>
    );
  }

  // If game is not active, show waiting message
  if (!gameActive) {
    return (
      <section className="treasure-hunt">
        <div className="container">
          <div className="hunt-content waiting-state">
            <h1>Welcome, {username}!</h1>
            <div className="waiting-message">
              <h2>Round 1 is not active yet</h2>
              <p>Please wait for the administrator to start Round 1.</p>
              <div className="waiting-animation">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <p className="refresh-note">This page will automatically update when the game starts.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const renderHintMessage = () => {
    if (!gameActive) return null;
    
    return (
      <div className="treasure-hunt-hint">
        <div className="hint-icon">💡</div>
        <div className="hint-content">
          <h4>Treasure Hunt Hint</h4>
          <p>
            There's a hidden link somewhere on this page that will take you to Round 2. 
            Look carefully in different sections of the website. The link might be invisible 
            until you hover over it!
          </p>
          <div className="hint-progress">
            <div className="hint-progress-label">Your progress:</div>
            <div className="hint-progress-bar">
              <div 
                className="hint-progress-fill" 
                style={{ width: activeRound === 1 ? '100%' : '0%' }}
              ></div>
            </div>
            <div className="hint-progress-status">
              {activeRound === 1 
                ? 'Congratulations! You found the hidden link!' 
                : 'Still searching for the hidden link...'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDebugPanel = () => {
    // Only show in development mode
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="debug-panel">
        <h4>Debug Panel (Dev Only)</h4>
        <p>Player ID: {playerId || 'Not logged in'}</p>
        <p>Status: {gameActive ? 'Active' : 'Inactive'}</p>
        <button 
          className="debug-button"
          onClick={() => {
            // Highlight all possible link locations with a subtle outline
            const allLinks = document.querySelectorAll('a');
            allLinks.forEach(link => {
              if (link.id && link.id.startsWith('link-')) {
                link.classList.add('debug-highlight');
              }
            });
            setTimeout(() => {
              allLinks.forEach(link => {
                link.classList.remove('debug-highlight');
              });
            }, 3000);
          }}
        >
          Highlight All Links (3s)
        </button>
      </div>
    );
  };

  return (
    <section className="treasure-hunt">
      <div className="container">
        {showCongratulations && (
          <div className="congratulations-overlay">
            <div className="congratulations-content">
              <h2>Congratulations, {username}!</h2>
              <p>You found the hidden link to Round Two!</p>
              <div className="celebration-animation">
                🎉 🏆 🎊
              </div>
              <p>Redirecting to Round Two...</p>
            </div>
          </div>
        )}
        <div className="hunt-content">
          <h1>Welcome to Round 1, {username}!</h1>
          <p>Find the hidden link to proceed to Round 2. <strong>Only the first 15 players will qualify!</strong></p>
          <div className="click-counter">
            <span>Attempts: {clickCount}</span>
          </div>
          
          {/* Competition information */}
          <div className="competition-info">
            <p className="competition-notice">
              <span className="competition-icon">🏆</span> 
              <span>This is a competitive challenge! Out of approximately 50 players, only the first 15 to find the real link will advance to Round 2.</span>
            </p>
            <p className="competition-tip">Speed and accuracy are both important - find the real link as quickly as possible!</p>
          </div>
          
          {/* MEDIUM DIFFICULTY: Add more helpful hints */}
          <div className="difficulty-info">
            <p><strong>Difficulty Level: Medium</strong></p>
            <p>Hint: Look for hidden links in the text, images, icons, and buttons below. Some elements are clickable - one of them leads to Round 2!</p>
            <p>Tip: Real links have subtle visual differences when you hover over them.</p>
          </div>
          
          {penalty && (
            <div className="penalty-box">
              <p>Wrong link! Try again in {penaltyTime} seconds.</p>
            </div>
          )}
          
          {/* Educational content with hidden links */}
          <div className="educational-content">
            {educationalContent.map((content, index) => (
              <div key={`content-${index}`} className="content-section">
                <h3>{content.title}</h3>
                <TextWithHiddenLinks
                  text={content.text}
                  playerId={playerId}
                  page={content.page}
                  linkWords={content.realLinkWords}
                  decoyWords={content.decoyLinkWords}
                  onWrongClick={() => {
                    handleWrongClick(`text-${content.page}-${index}`);
                    setClickCount(prev => prev + 1);
                  }}
                  onCorrectClick={(e) => {
                    handleCorrectClick(e);
                    setClickCount(prev => prev + 1);
                  }}
                />
              </div>
            ))}
          </div>
          
          {/* Hidden elements with links (buttons) */}
          <div className="hidden-elements-container">
            <h3>Educational Resources</h3>
            <div className="hidden-elements">
              {/* Buttons section */}
              <div className="buttons-section">
                <h4>Interactive Tools</h4>
                <div className="button-group">
                  {hiddenElements
                    .filter(element => element.type === 'button')
                    .map((element, index) => {
                      // Get links for this page
                      const pageLinks = getPageLinks(element.page, playerId);
                      // Find a link based on whether this should be real or decoy
                      const linkData = element.isReal 
                        ? pageLinks.find(link => link.isReal && link.visible)
                        : pageLinks.find(link => !link.isReal && link.visible);
                      
                      if (!linkData) return null;
                      
                      return (
                        <HiddenLink
                          key={`button-${index}`}
                          linkData={linkData}
                          playerId={playerId}
                          variant="button"
                          buttonText={element.text}
                          className="treasure-hunt-button"
                          onWrongClick={() => {
                            handleWrongClick(`button-${element.page}-${index}`);
                            setClickCount(prev => prev + 1);
                          }}
                          onCorrectClick={(e) => {
                            handleCorrectClick(e);
                            setClickCount(prev => prev + 1);
                          }}
                        >
                          {element.text}
                        </HiddenLink>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
          
          {/* MEDIUM DIFFICULTY: Add a more visible console hint */}
          <div className="dev-tools-hint">
            <p>Pro tip: Check the developer tools for additional clues!</p>
          </div>
          
          {/* The actual hidden link - positioned randomly (as a backup) */}
          <a 
            href="/treasureHunt/round2" 
            className="hidden-link"
            style={{ top: `${randomPosition.top}%`, left: `${randomPosition.left}%` }}
            onClick={handleCorrectClick}
          >
            {/* Invisible link */}
          </a>
          
          {/* Misleading content */}
          <div className="misleading-content">
            <h3>Hints:</h3>
            <ul>
              <li>The link might be hidden within the text above</li>
              <li>Pay attention to specific words that stand out</li>
              <li>Hover over words to see if they're clickable</li>
              <li>Not all clickable words lead to Round 2</li>
              <li>Be quick! Only the first 15 players will qualify</li>
            </ul>
            
            <div className="player-count-info">
              <h4>Competition Status:</h4>
              <p>Total players participating: ~50</p>
              <p>Qualification spots remaining: 15</p>
              <p>Find the real link before others to secure your spot!</p>
            </div>
          </div>
        </div>
      </div>
      
      {renderHintMessage()}
      
      {renderDebugPanel()}
    </section>
  );
};

export default TreasureHunt; 