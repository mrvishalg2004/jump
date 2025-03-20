import React from 'react';
import { generateHash } from '../../utils/linkHider';

/**
 * TextWithHiddenLinks Component
 * 
 * This component renders a paragraph of text with hidden links embedded within specific words.
 * It makes the treasure hunt more intuitive by hiding links in natural text content.
 * 
 * DIFFICULTY: MEDIUM - Links are embedded in text, making them more discoverable
 */
const TextWithHiddenLinks = ({ 
  text, 
  playerId, 
  page = 'default', 
  linkWords = [], 
  decoyWords = [], 
  onWrongClick = () => {}, 
  onCorrectClick = () => {} 
}) => {
  if (!text) return <p>Content loading...</p>;
  
  try {
    // Split the text into an array of words
    const words = text.split(' ');
    
    // Generate a hash for this particular player
    const playerHash = generateHash(playerId || 'default-player');
    
    // Determine which links to show based on player hash
    // This ensures different players see links in different places
    const shouldShowLink = (word) => {
      return linkWords.includes(word);
    };
    
    const isDecoyLink = (word) => {
      return decoyWords.includes(word);
    };
    
    // Render the text with links and decoy links
    return (
      <p className="text-with-links">
        {words.map((word, index) => {
          // Check if this word should be a real link
          if (shouldShowLink(word)) {
            // Real link that leads to the treasure hunt
            return (
              <span key={`word-${index}`}>
                <a
                  href={`#real-link-${page}-${index}`}
                  className="real-link"
                  onClick={onCorrectClick}
                >
                  {word}
                </a>
                {index < words.length - 1 ? ' ' : ''}
              </span>
            );
          }
          
          // Check if this word should be a decoy link
          if (isDecoyLink(word)) {
            // Decoy link that doesn't lead anywhere
            return (
              <span key={`word-${index}`}>
                <a
                  href={`#decoy-link-${page}-${index}`}
                  className="decoy-link"
                  onClick={(e) => {
                    e.preventDefault();
                    onWrongClick();
                  }}
                >
                  {word}
                </a>
                {index < words.length - 1 ? ' ' : ''}
              </span>
            );
          }
          
          // Regular word, not a link
          return (
            <span key={`word-${index}`}>
              {word}
              {index < words.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </p>
    );
  } catch (error) {
    console.error('Error rendering TextWithHiddenLinks:', error);
    return <p>{text}</p>; // Fallback to plain text if there's an error
  }
};

export default TextWithHiddenLinks; 