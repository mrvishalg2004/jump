import React from 'react';

/**
 * HiddenLink Component
 * 
 * This component renders a hidden link that can be placed anywhere on the website.
 * It can be configured to be visible or invisible based on the player's ID.
 * It can also be configured to be a real link to Round 2 or a decoy link.
 * 
 * DIFFICULTY: MEDIUM - Real links have subtle visual cues
 * 
 * Supported variants:
 * - 'text': Hidden in text content
 * - 'icon': Hidden as an icon
 * - 'image': Hidden in an image
 * - 'logo': Hidden in a logo
 * - 'button': Hidden in a button
 * - 'hidden': Completely invisible
 */
const HiddenLink = ({
  linkData = {},
  playerId = '',
  variant = 'text',
  buttonText = 'Click Me',
  className = '',
  onWrongClick = () => {},
  onCorrectClick = () => {},
  children
}) => {
  const isRealLink = linkData.isReal || false;
  
  // Determine base class based on variant
  let baseClass = '';
  if (variant === 'text') {
    baseClass = 'hidden-text-link';
  } else if (variant === 'button') {
    baseClass = 'hidden-button-link';
  } else if (variant === 'image') {
    baseClass = 'hidden-image-link';
  }
  
  // Add real or decoy class
  const linkClass = `${baseClass} ${isRealLink ? 'real' : 'decoy'} ${className}`.trim();
  
  // Create a safe href
  const href = isRealLink ? '#treasure-found' : '#decoy-link';
  
  // Handle the click event
  const handleClick = (e) => {
    e.preventDefault();
    
    try {
      if (isRealLink) {
        onCorrectClick(e);
      } else {
        onWrongClick(e);
      }
    } catch (error) {
      console.error('Error in HiddenLink click handler:', error);
    }
  };
  
  // Render the appropriate variant
  if (variant === 'button') {
    return (
      <button 
        className={linkClass}
        onClick={handleClick}
      >
        {buttonText || children}
      </button>
    );
  }
  
  // Default is text link
  return (
    <a 
      href={href}
      className={linkClass}
      onClick={handleClick}
    >
      {children}
    </a>
  );
};

export default HiddenLink; 