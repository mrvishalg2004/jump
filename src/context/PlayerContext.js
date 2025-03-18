import React, { createContext, useState, useEffect, useContext } from 'react';
import { getPageLinks } from '../utils/linkHider';

// Create the context
const PlayerContext = createContext();

// Custom hook to use the player context
export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

// Provider component
export const PlayerProvider = ({ children }) => {
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [gameState, setGameState] = useState({
    activeRound: 0,
    hasQualified: false,
    timeTaken: 0,
    startTime: null,
    endTime: null
  });
  const [currentPage, setCurrentPage] = useState('');
  const [pageLinks, setPageLinks] = useState([]);
  
  // Load player data from localStorage on mount
  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedPlayerName = localStorage.getItem('playerName');
    const storedGameState = localStorage.getItem('gameState');
    
    if (storedPlayerId) setPlayerId(storedPlayerId);
    if (storedPlayerName) setPlayerName(storedPlayerName);
    if (storedGameState) {
      try {
        setGameState(JSON.parse(storedGameState));
      } catch (error) {
        console.error('Error parsing stored game state:', error);
      }
    }
  }, []);
  
  // Save player data to localStorage when it changes
  useEffect(() => {
    if (playerId) localStorage.setItem('playerId', playerId);
    if (playerName) localStorage.setItem('playerName', playerName);
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }, [playerId, playerName, gameState]);
  
  // Update page links when the current page or player ID changes
  useEffect(() => {
    if (currentPage && playerId) {
      const links = getPageLinks(currentPage, playerId);
      setPageLinks(links);
    } else {
      setPageLinks([]);
    }
  }, [currentPage, playerId]);
  
  // Set the player ID and name
  const setPlayer = (id, name) => {
    setPlayerId(id);
    setPlayerName(name);
  };
  
  // Update the game state
  const updateGameState = (newState) => {
    setGameState(prevState => ({ ...prevState, ...newState }));
  };
  
  // Start the game timer
  const startTimer = () => {
    const now = Date.now();
    updateGameState({ startTime: now });
  };
  
  // Stop the game timer and calculate time taken
  const stopTimer = () => {
    const now = Date.now();
    const timeTaken = now - (gameState.startTime || now);
    updateGameState({ endTime: now, timeTaken });
    return timeTaken;
  };
  
  // Reset the player state
  const resetPlayer = () => {
    setPlayerId(null);
    setPlayerName('');
    setGameState({
      activeRound: 0,
      hasQualified: false,
      timeTaken: 0,
      startTime: null,
      endTime: null
    });
    localStorage.removeItem('playerId');
    localStorage.removeItem('playerName');
    localStorage.removeItem('gameState');
  };
  
  // Get a link for a specific section and position
  const getLinkForPosition = (section, position) => {
    return pageLinks.find(link => 
      link.location.section === section && 
      link.location.position === position
    );
  };
  
  // The context value
  const value = {
    playerId,
    playerName,
    gameState,
    currentPage,
    pageLinks,
    setCurrentPage,
    setPlayer,
    updateGameState,
    startTimer,
    stopTimer,
    resetPlayer,
    getLinkForPosition
  };
  
  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

export default PlayerContext; 