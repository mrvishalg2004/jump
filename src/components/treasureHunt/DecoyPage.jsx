import React, { useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { Link } from 'react-router-dom';
import './DecoyPage.css';

/**
 * DecoyPage Component
 * 
 * This component renders a decoy page for the treasure hunt.
 * It displays different content based on the page number and type.
 */
const DecoyPage = ({ pageNumber = 1, clue = false, hint = false }) => {
  const { playerId, playerName } = usePlayer();
  
  // Redirect to treasure hunt if no player ID
  useEffect(() => {
    if (!playerId) {
      window.location.href = '/treasure-hunt';
    }
  }, [playerId]);
  
  // Get a random message based on the page number
  const getRandomMessage = () => {
    const messages = [
      "Hmm, this doesn't seem right. Keep searching!",
      "Not quite what you're looking for. Try another path.",
      "You're on the wrong track. The treasure lies elsewhere.",
      "This is a dead end. Retrace your steps.",
      "The treasure isn't here. Keep exploring!",
      "You've wandered into a decoy. The real path is hidden elsewhere.",
      "This is just a distraction. The real clue is somewhere else.",
      "Nice try, but the treasure isn't here. Keep searching!",
      "You're getting warmer, but not quite there yet.",
      "The treasure hunt continues elsewhere. This is just a detour."
    ];
    
    // Use the page number to select a message, but add some randomness
    const index = (pageNumber + new Date().getMinutes()) % messages.length;
    return messages[index];
  };
  
  // Get a random clue based on the page number
  const getRandomClue = () => {
    const clues = [
      "The treasure is hidden in plain sight.",
      "Look for links in unexpected places.",
      "Sometimes the most ordinary things hide extraordinary secrets.",
      "The path to treasure might be where you least expect it.",
      "Not all that glitters is gold, but sometimes it leads to it.",
      "The journey matters more than the destination.",
      "Hidden treasures often lie beneath ordinary appearances.",
      "The key to finding treasure is thorough exploration.",
      "Sometimes you need to revisit familiar places with new eyes.",
      "The treasure might be hiding in the details you overlooked."
    ];
    
    // Use the page number to select a clue, but add some randomness
    const index = (pageNumber + new Date().getHours()) % clues.length;
    return clues[index];
  };
  
  // Get a random hint based on the page number
  const getRandomHint = () => {
    const hints = [
      "Try exploring the About page more carefully.",
      "Have you checked all the sections of the Contact page?",
      "The Courses page might have something interesting.",
      "The Pricing page could contain valuable information.",
      "Don't forget to check the Journal section.",
      "Sometimes links are hidden in plain sight.",
      "Look for subtle differences in text or icons.",
      "Hover over different elements to see if anything changes.",
      "The footer might contain useful links.",
      "Check the navigation menu carefully."
    ];
    
    // Use the page number to select a hint, but add some randomness
    const index = (pageNumber + new Date().getDate()) % hints.length;
    return hints[index];
  };
  
  return (
    <section className="decoy-page">
      <div className="container">
        <div className="decoy-content">
          <h1>Treasure Hunt - {clue ? 'Clue' : hint ? 'Hint' : 'Decoy'} Page</h1>
          
          <div className="decoy-message">
            <p className="player-greeting">Hello, {playerName || 'Treasure Hunter'}!</p>
            
            {clue ? (
              <>
                <h2>You've found a clue!</h2>
                <p className="clue-text">{getRandomClue()}</p>
              </>
            ) : hint ? (
              <>
                <h2>You've found a hint!</h2>
                <p className="hint-text">{getRandomHint()}</p>
              </>
            ) : (
              <>
                <h2>Decoy Page #{pageNumber}</h2>
                <p className="decoy-text">{getRandomMessage()}</p>
              </>
            )}
          </div>
          
          <div className="decoy-navigation">
            <Link to="/treasure-hunt" className="back-button">Return to Treasure Hunt</Link>
            
            <div className="decoy-links">
              <p>Continue exploring:</p>
              <div className="link-grid">
                <Link to="/about">About</Link>
                <Link to="/contact">Contact</Link>
                <Link to="/courses">Courses</Link>
                <Link to="/pricing">Pricing</Link>
                <Link to="/journal">Journal</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DecoyPage; 