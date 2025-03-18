/**
 * Link Hider Utility
 * 
 * This utility handles the generation and randomization of hidden links
 * for the treasure hunt game. It creates a unique pattern of real and
 * decoy links based on the player's ID.
 * 
 * DIFFICULTY: MEDIUM - More links are visible and the real link has subtle hints
 */

// Generate a hash from a string (player ID)
const generateHash = (str) => {
  let hash = 0;
  if (str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Get a list of potential link locations
const getLinkLocations = () => [
  { page: 'about', section: 'header', position: 'right' },
  { page: 'about', section: 'mission', position: 'bottom' },
  { page: 'about', section: 'team', position: 'middle' },
  { page: 'about', section: 'footer', position: 'left' },
  { page: 'contact', section: 'header', position: 'top' },
  { page: 'contact', section: 'form', position: 'right' },
  { page: 'contact', section: 'map', position: 'bottom' },
  { page: 'contact', section: 'footer', position: 'middle' },
  { page: 'courses', section: 'header', position: 'left' },
  { page: 'courses', section: 'list', position: 'top' },
  { page: 'courses', section: 'details', position: 'right' },
  { page: 'courses', section: 'footer', position: 'bottom' },
  { page: 'pricing', section: 'header', position: 'middle' },
  { page: 'pricing', section: 'plans', position: 'left' },
  { page: 'pricing', section: 'faq', position: 'top' },
  { page: 'pricing', section: 'footer', position: 'right' },
  { page: 'journal', section: 'header', position: 'bottom' },
  { page: 'journal', section: 'articles', position: 'middle' },
  { page: 'journal', section: 'sidebar', position: 'left' },
  { page: 'journal', section: 'footer', position: 'top' },
];

// Get decoy link destinations
const getDecoyDestinations = () => [
  '/decoy/page1',
  '/decoy/page2',
  '/decoy/page3',
  '/decoy/page4',
  '/decoy/page5',
  '/decoy/clue1',
  '/decoy/clue2',
  '/decoy/clue3',
  '/decoy/hint1',
  '/decoy/hint2',
];

// Determine if a link should be visible based on player ID and location
// MEDIUM DIFFICULTY: Show more links (1 in 3 instead of 1 in 7)
const shouldShowLink = (playerId, location, allLocations) => {
  if (!playerId) return false;
  
  const hash = generateHash(playerId);
  const locationIndex = allLocations.findIndex(
    loc => loc.page === location.page && 
           loc.section === location.section && 
           loc.position === location.position
  );
  
  if (locationIndex === -1) return false;
  
  // MEDIUM DIFFICULTY: Show approximately 1/3 of all links (was 1/7)
  return (hash + locationIndex) % 3 === 0;
};

// Determine if a link is a real link to Round 2 or a decoy
const isRealLink = (playerId, location, allLocations) => {
  if (!playerId) return false;
  
  const hash = generateHash(playerId);
  const locationIndex = allLocations.findIndex(
    loc => loc.page === location.page && 
           loc.section === location.section && 
           loc.position === location.position
  );
  
  if (locationIndex === -1) return false;
  
  // Only one location will be the real link
  // MEDIUM DIFFICULTY: Keep the same algorithm for determining the real link
  return (hash + locationIndex) % allLocations.length === hash % allLocations.length;
};

// Get a link destination (real or decoy)
const getLinkDestination = (playerId, location, allLocations, decoyDestinations) => {
  if (isRealLink(playerId, location, allLocations)) {
    return '/treasureHunt/round2';
  } else {
    const hash = generateHash(playerId);
    const decoyIndex = (hash + allLocations.findIndex(
      loc => loc.page === location.page && 
             loc.section === location.section && 
             loc.position === location.position
    )) % decoyDestinations.length;
    
    return decoyDestinations[decoyIndex];
  }
};

// Get a unique link ID for tracking clicks
const getLinkId = (playerId, location) => {
  return `link-${playerId}-${location.page}-${location.section}-${location.position}`;
};

// Get all link locations for a specific page
const getPageLinks = (page, playerId) => {
  const allLocations = getLinkLocations();
  const decoyDestinations = getDecoyDestinations();
  
  return allLocations
    .filter(location => location.page === page)
    .map(location => ({
      location,
      visible: shouldShowLink(playerId, location, allLocations),
      destination: getLinkDestination(playerId, location, allLocations, decoyDestinations),
      isReal: isRealLink(playerId, location, allLocations),
      linkId: getLinkId(playerId, location)
    }));
};

// Track a link click (for admin analytics)
const trackLinkClick = async (linkId, playerId) => {
  try {
    const apiPort = localStorage.getItem('apiPort') || '5000';
    const response = await fetch(`http://localhost:${apiPort}/api/players/track-link-click`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ linkId, playerId }),
    });
    return await response.json();
  } catch (error) {
    console.error('Error tracking link click:', error);
    return { success: false, error: error.message };
  }
};

export {
  getPageLinks,
  trackLinkClick,
  generateHash,
  getLinkLocations,
  getDecoyDestinations
}; 