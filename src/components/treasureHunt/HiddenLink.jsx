import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { trackLinkClick } from '../../utils/linkHider';
import './HiddenLink.css';

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
  linkData, 
  playerId, 
  children, 
  className = '', 
  style = {},
  variant = 'text', // 'text', 'icon', 'image', 'logo', 'button', 'hidden'
  imageProps = {}, // For image variant: src, alt, width, height
  iconName = '🔍', // For icon variant
  buttonText = 'Click Me' // For button variant
}) => {
  const history = useHistory();
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [pulseEffect, setPulseEffect] = useState(false);
  
  // Check if link is visible before rendering
  const isVisible = linkData && linkData.visible;
  
  // Add a subtle pulse effect every 30 seconds to help players notice the link
  useEffect(() => {
    // Only run the effect if the link is visible
    if (!isVisible) {
      return () => {}; // Return empty cleanup function when link is not visible
    }
    
    const pulseInterval = setInterval(() => {
      setPulseEffect(true);
      setTimeout(() => setPulseEffect(false), 2000);
    }, 30000);
    
    // Trigger an initial pulse after 5 seconds
    const initialPulseTimeout = setTimeout(() => {
      setPulseEffect(true);
      setTimeout(() => setPulseEffect(false), 2000);
    }, 5000);
    
    return () => {
      clearInterval(pulseInterval);
      clearTimeout(initialPulseTimeout);
    };
  }, [isVisible]); // Only depend on isVisible, not the entire linkData object
  
  // If no link data or not visible, render nothing or children
  if (!isVisible) {
    return children || null;
  }
  
  const handleClick = async (e) => {
    e.preventDefault();
    
    // Track the click for admin analytics
    if (playerId && linkData.linkId) {
      try {
        const response = await trackLinkClick(linkData.linkId, playerId);
        
        // Handle qualification response
        if (response.success && response.isRealLink) {
          // Show qualification message
          alert(response.qualificationMessage);
          
          // If qualified, redirect to round 2 page
          if (response.qualified) {
            setClicked(true);
            setTimeout(() => {
              history.push('/treasure-hunt/round2');
            }, 1000);
            return;
          }
        }
      } catch (error) {
        console.error('Error tracking link click:', error);
      }
    }
    
    setClicked(true);
    
    // Navigate to the destination after a short delay
    setTimeout(() => {
      if (linkData.destination) {
        history.push(linkData.destination);
      }
    }, 300);
  };
  
  // Determine the content based on the variant
  let content;
  switch (variant) {
    case 'icon':
      content = (
        <span 
          className={`hidden-link-icon ${clicked ? 'clicked' : ''} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
          title="Hidden Treasure"
          role="img"
          aria-label="Hidden treasure link icon"
        >
          {iconName}
        </span>
      );
      break;
    case 'image':
      content = (
        <img 
          src={imageProps.src || '/images/default.jpg'} 
          alt={imageProps.alt || 'Hidden treasure'} 
          width={imageProps.width} 
          height={imageProps.height}
          className={`hidden-link-image ${clicked ? 'clicked' : ''} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
          title="Hidden Treasure"
        />
      );
      break;
    case 'logo':
      content = (
        <div 
          className={`hidden-link-logo ${clicked ? 'clicked' : ''} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
          title="Hidden Treasure"
        >
          {children || <img src="/images/logo.png" alt="Logo" />}
        </div>
      );
      break;
    case 'button':
      content = (
        <button 
          className={`hidden-link-button ${clicked ? 'clicked' : ''} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
          title="Hidden Treasure"
          type="button"
        >
          {children || buttonText}
        </button>
      );
      break;
    case 'hidden':
      content = (
        <span 
          className={`hidden-link-invisible ${clicked ? 'clicked' : ''} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
          title="Hidden Treasure"
        >
          {children || '•'}
        </span>
      );
      break;
    case 'text':
    default:
      content = (
        <span 
          className={`hidden-link-text ${clicked ? 'clicked' : ''} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
          title="Hidden Treasure"
        >
          {children || 'Discover More'}
        </span>
      );
  }
  
  // MEDIUM DIFFICULTY: Add a hint for real links
  const isRealLink = linkData.isReal;
  const destination = linkData.destination || '#';
  
  return (
    <a
      href={destination}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      className={`hidden-link ${className} ${isRealLink ? 'real-link' : 'decoy-link'} ${hovered ? 'hovered' : ''} ${pulseEffect ? 'pulse' : ''}`}
      style={{
        ...style,
        position: 'relative',
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer', // Always show pointer cursor for better clickability
        userSelect: 'none', // Prevent text selection for better UX
        WebkitTapHighlightColor: 'transparent', // Remove tap highlight on mobile
      }}
      data-link-id={linkData.linkId}
      data-is-real={isRealLink.toString()}
      aria-label="Hidden treasure hunt link"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Add keyboard accessibility
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
    >
      {content}
      
      {/* Visual indicator that appears on hover */}
      <span 
        className="link-indicator"
        style={{
          opacity: hovered ? 1 : 0,
          position: 'absolute',
          bottom: '-3px',
          left: '0',
          width: '100%',
          height: '2px',
          backgroundColor: '#1eb2a6',
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none', // Ensure it doesn't interfere with clicks
        }}
        aria-hidden="true"
      />
      
      {/* Tooltip that appears on hover */}
      <span 
        className="link-tooltip"
        style={{
          opacity: hovered ? 1 : 0,
          visibility: hovered ? 'visible' : 'hidden',
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '5px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          transition: 'opacity 0.3s ease, visibility 0.3s ease',
          pointerEvents: 'none', // Ensure it doesn't interfere with clicks
        }}
        aria-hidden="true"
      >
        Click to explore
      </span>
    </a>
  );
};

export default HiddenLink; 