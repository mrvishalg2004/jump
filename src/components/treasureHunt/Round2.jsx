import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';
import axios from 'axios';
import io from 'socket.io-client';
import './Round2.css';

/**
 * Round2 Component
 * 
 * This component displays a congratulations message for players who have qualified for Round 2.
 * It verifies that the player has actually qualified before showing the content.
 * 
 * DEMO VERSION: Includes a simple demo challenge to test functionality.
 */
const Round2 = () => {
  const { playerId, username } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [qualified, setQualified] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [rank, setRank] = useState(null);
  const [demoStarted, setDemoStarted] = useState(false);
  const [demoCompleted, setDemoCompleted] = useState(false);
  const [demoAnswer, setDemoAnswer] = useState('');
  const history = useHistory();
  
  useEffect(() => {
    const verifyQualification = async () => {
      if (!playerId) {
        history.push('/treasure-hunt');
        return;
      }
      
      try {
        const apiPort = localStorage.getItem('apiPort') || '5000';
        const response = await axios.get(`http://localhost:${apiPort}/api/players/${playerId}`);
        
        if (response.data.success) {
          const player = response.data.player;
          
          if (player.status === 'Qualified for Round 2') {
            setQualified(true);
            setTimeTaken(player.timeTaken);
            
            // Send player info to backend
            await axios.post(`http://localhost:${apiPort}/api/players/update-status`, {
              playerId,
              status: 'Round 1 Completed'
            });
            
            // Emit event to admin panel
            const socket = io(`http://localhost:${apiPort}`);
            socket.emit('playerUpdate', { playerId, username, status: 'Round 1 Completed' });

            // Get player rank
            const rankResponse = await axios.get(`http://localhost:${apiPort}/api/players/qualified`);
            if (rankResponse.data.success) {
              const qualifiedPlayers = rankResponse.data.players;
              const sortedPlayers = qualifiedPlayers.sort((a, b) => a.timeTaken - b.timeTaken);
              const playerIndex = sortedPlayers.findIndex(p => p.playerId === playerId);
              
              if (playerIndex !== -1) {
                setRank(playerIndex + 1);
              }
            }
          } else {
            history.push('/treasure-hunt');
          }
        } else {
          history.push('/treasure-hunt');
        }
      } catch (error) {
        console.error('Error verifying qualification:', error);
        history.push('/treasure-hunt');
      } finally {
        setLoading(false);
      }
    };
    
    verifyQualification();
  }, [playerId, history]);
  
  // Handle starting the demo challenge
  const handleStartDemo = () => {
    setDemoStarted(true);
    
    // Add a console hint for the demo challenge
    console.log(
      '%c ROUND 2 DEMO CHALLENGE ',
      'background: #e74c3c; color: #fff; font-weight: bold; padding: 4px 8px; border-radius: 4px;'
    );
    console.log(
      '%c The answer to the demo challenge is: "education" ',
      'color: #3498db; font-style: italic;'
    );
  };
  
  // Handle submitting the demo answer
  const handleSubmitDemo = (e) => {
    e.preventDefault();
    
    if (demoAnswer.toLowerCase() === 'education') {
      setDemoCompleted(true);
    } else {
      alert('Incorrect answer. Try again!');
    }
  };
  
  if (loading) {
    return (
      <div className="round2-loading">
        <h2>Loading...</h2>
      </div>
    );
  }
  
  if (!qualified) {
    return null; // Will redirect in useEffect
  }
  
  // Format time taken in minutes and seconds
  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };
  
  return (
    <div className="round2-container">
      {loading && <p>Loading...</p>}
      {!loading && qualified && (
        <div>
          <h2>Congratulations, {username}!</h2>
          <p>You have successfully completed Round 1 and qualified for Round 2!</p>
          {rank && <p>Your current rank is: {rank}</p>}
        </div>
      )}
      {!loading && !qualified && <p>You have not qualified for Round 2 yet.</p>}
      
      <div className="round2-content">
        <div className="round2-header">
          <h1>Congratulations, {username}!</h1>
          <div className="qualification-badge">
            <span className="badge-icon">🏆</span>
            <span className="badge-text">Qualified for Round 2</span>
          </div>
        </div>
        
        <div className="round2-details">
          <p className="round2-message">
            You have successfully found the hidden link and qualified for Round 2 of the Treasure Hunt!
            <span className="qualification-highlight">You are one of only 15 players who qualified out of approximately 50 participants!</span>
          </p>
          
          <div className="round2-stats">
            <div className="stat-item">
              <span className="stat-label">Time Taken:</span>
              <span className="stat-value">{formatTime(timeTaken)}</span>
            </div>
            
            {rank && (
              <div className="stat-item">
                <span className="stat-label">Your Rank:</span>
                <span className="stat-value">{rank} of 15</span>
              </div>
            )}
          </div>
          
          {!demoStarted && !demoCompleted && (
            <div className="demo-start-section">
              <h3>Demo Challenge</h3>
              <p>This is a demo version of Round 2 to test functionality.</p>
              <button 
                className="demo-start-button"
                onClick={handleStartDemo}
              >
                Start Demo Challenge
              </button>
            </div>
          )}
          
          {demoStarted && !demoCompleted && (
            <div className="demo-challenge-section">
              <h3>Demo Challenge</h3>
              <p>Solve this simple puzzle to complete the demo:</p>
              
              <div className="demo-puzzle">
                <p>What is the theme of this website?</p>
                <p className="puzzle-hint">Hint: Check the console for a clue.</p>
                
                <form onSubmit={handleSubmitDemo} className="demo-form">
                  <input
                    type="text"
                    value={demoAnswer}
                    onChange={(e) => setDemoAnswer(e.target.value)}
                    placeholder="Enter your answer"
                    className="demo-input"
                  />
                  <button type="submit" className="demo-submit-button">
                    Submit Answer
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {demoCompleted && (
            <div className="demo-completed-section">
              <h3>Demo Challenge Completed!</h3>
              <p className="demo-success-message">
                Congratulations! You've successfully completed the demo challenge.
              </p>
              <div className="demo-success-icon">🎉</div>
              <p>
                This confirms that the Round 2 functionality is working correctly.
                The full Round 2 challenge will be implemented soon.
              </p>
            </div>
          )}
          
          {demoCompleted && (
            <div className="proceed-section">
              <h3>Congratulations on completing the demo!</h3>
              <p>Click the button below to proceed to the next round:</p>
              <a href="http://127.0.0.1:49534" className="proceed-button">
                Proceed to Round 2
              </a>
            </div>
          )}
          
          <div className="round2-instructions">
            <h3>What's Next?</h3>
            <p>
              The admin will contact you with instructions for the full Round 2 challenge. 
              Please make sure your contact information is up to date.
            </p>
            <p>
              Round 2 will be even more challenging, so get ready for the next level of the hunt!
            </p>
            <p className="exclusive-access">
              <span className="exclusive-icon">🔒</span> You now have exclusive access to Round 2 content that only the top 15 players can see.
            </p>
          </div>
        </div>
        
        <div className="round2-actions">
          <button 
            className="round2-button"
            onClick={() => history.push('/treasure-hunt')}
          >
            Back to Treasure Hunt
          </button>
        </div>
      </div>
    </div>
  );
};

export default Round2; 