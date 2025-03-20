/**
 * Link Hider Utility
 * 
 * This utility handles the generation and randomization of hidden links
 * for the treasure hunt game. It creates a unique pattern of real and
 * decoy links based on the player's ID.
 * 
 * DIFFICULTY: MEDIUM - More links are visible and the real link has subtle hints
 */

import axios from 'axios';
import { getApiEndpoint } from './apiConfig';

/**
 * Generates a consistent hash based on a player ID
 * Used to ensure the same player always sees the same links
 */
export const generateHash = (playerId) => {
  // Simple hashing function
  let hash = 0;
  if (!playerId || playerId.length === 0) return hash;
  
  for (let i = 0; i < playerId.length; i++) {
    const char = playerId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return Math.abs(hash);
};

/**
 * Tracks a link click in the backend
 */
export const trackLinkClick = async (linkId, playerId, isCorrect = false) => {
  try {
    const endpoint = getApiEndpoint('/api/players/track-link-click');
    
    const response = await axios.post(endpoint, {
      linkId,
      playerId,
      isCorrect
    });
    
    return response.data;
  } catch (error) {
    console.error('Error tracking link click:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Gets page-specific links based on the player ID
 */
export const getPageLinks = (page, playerId) => {
  // Generate a hash based on player ID for consistent link positions
  const hash = generateHash(playerId);
  
  // Default links
  const links = [
    {
      linkId: `${page}-real-1`,
      isReal: true,
      visible: true,
      destination: '/round2'
    },
    {
      linkId: `${page}-decoy-1`,
      isReal: false,
      visible: true,
      destination: '/decoy/page1'
    },
    {
      linkId: `${page}-decoy-2`,
      isReal: false,
      visible: true,
      destination: '/decoy/page2'
    }
  ];
  
  return links;
};

/**
 * Gets link locations for text content
 */
export const getLinkLocations = (text, playerId) => {
  // Generate a hash from the player ID
  const hash = generateHash(playerId);
  
  // Split text into words
  const words = text.split(' ');
  
  // Determine which words will be potential link locations
  // Use the hash to create a consistent but seemingly random pattern
  const linkLocations = words.map((word, index) => {
    // Skip short words and punctuation
    if (word.length <= 2 || /^[.,!?;:()]+$/.test(word)) {
      return { word, isLink: false, index };
    }
    
    // Use the hash and word position to determine if it's a link
    const shouldBeLink = ((hash + index) % 7 === 0);
    
    return {
      word,
      isLink: shouldBeLink,
      index,
      isRealLink: ((hash + index) % 19 === 0) // Rare condition for real link
    };
  });
  
  return linkLocations;
};

/**
 * Gets an array of decoy destinations
 */
export const getDecoyDestinations = () => {
  return [
    '/decoy/page1',
    '/decoy/page2',
    '/decoy/page3',
    '/decoy/page4',
    '/decoy/page5',
    '/decoy/clue1',
    '/decoy/clue2',
    '/decoy/hint1',
    '/decoy/hint2',
  ];
}; 