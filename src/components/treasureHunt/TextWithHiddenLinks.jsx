import React from 'react';
import HiddenLink from './HiddenLink';
import { getPageLinks } from '../../utils/linkHider';

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
  page,
  linkWords = [], 
  decoyWords = []
}) => {
  if (!text || !playerId) {
    return <p>{text}</p>;
  }

  // Get all possible links for this page
  const pageLinks = getPageLinks(page, playerId);
  
  // If no links are available, just return the text
  if (!pageLinks || pageLinks.length === 0) {
    return <p>{text}</p>;
  }

  // Filter to only visible links
  const visibleLinks = pageLinks.filter(link => link.visible);
  
  // If no visible links, just return the text
  if (visibleLinks.length === 0) {
    return <p>{text}</p>;
  }

  // If no specific words are provided, use default approach
  if (linkWords.length === 0 && decoyWords.length === 0) {
    // Split text into words
    const words = text.split(' ');
    
    // Determine which words will be links (real or decoy)
    // For medium difficulty, make about 1 in 5 words a potential link
    const linkedWords = words.map((word, index) => {
      // Skip very short words and punctuation
      if (word.length <= 2 || /^[.,!?;:()]+$/.test(word)) {
        return { word, isLink: false };
      }
      
      // Determine if this word should be a link (about 20% chance)
      const shouldBeLink = (index + playerId.length) % 5 === 0;
      
      return { 
        word, 
        isLink: shouldBeLink
      };
    });
    
    // Assign real and decoy links to the words marked as links
    let linkIndex = 0;
    const processedWords = linkedWords.map(({ word, isLink }) => {
      if (!isLink) {
        return word;
      }
      
      // Get the next link
      const linkData = visibleLinks[linkIndex % visibleLinks.length];
      linkIndex++;
      
      // Override the destination for real links to point to Round 2
      const modifiedLinkData = {
        ...linkData,
        destination: linkData.isReal ? '/treasureHunt/round2' : linkData.destination
      };
      
      return (
        <HiddenLink
          key={`link-${word}-${linkIndex}`}
          linkData={modifiedLinkData}
          playerId={playerId}
          variant="text"
        >
          {word}
        </HiddenLink>
      );
    });
    
    // Join the words back together with spaces
    return (
      <p className="text-with-hidden-links">
        {processedWords.map((word, index) => (
          React.isValidElement(word) 
            ? word 
            : <React.Fragment key={`word-${index}`}>{word}{' '}</React.Fragment>
        ))}
      </p>
    );
  }
  
  // If specific words are provided, use those
  // Split text into words
  const words = text.split(' ');
  
  // Process each word
  const processedWords = words.map((word, index) => {
    // Check if this word is in the linkWords list
    const cleanWord = word.replace(/[.,!?;:()]+/g, '').toLowerCase();
    
    // Check if this word should be a real link
    if (linkWords.some(linkWord => linkWord.toLowerCase() === cleanWord)) {
      // Find a real link
      const realLink = visibleLinks.find(link => link.isReal);
      
      if (realLink) {
        // Create a modified link data with Round 2 destination
        const modifiedLinkData = {
          ...realLink,
          destination: '/treasureHunt/round2'
        };
        
        return (
          <HiddenLink
            key={`real-link-${index}`}
            linkData={modifiedLinkData}
            playerId={playerId}
            variant="text"
          >
            {word}
          </HiddenLink>
        );
      }
    }
    
    // Check if this word should be a decoy link
    if (decoyWords.some(decoyWord => decoyWord.toLowerCase() === cleanWord)) {
      // Find a decoy link
      const decoyLink = visibleLinks.find(link => !link.isReal);
      
      if (decoyLink) {
        return (
          <HiddenLink
            key={`decoy-link-${index}`}
            linkData={decoyLink}
            playerId={playerId}
            variant="text"
          >
            {word}
          </HiddenLink>
        );
      }
    }
    
    // Regular word
    return word;
  });
  
  // Join the words back together with spaces
  return (
    <p className="text-with-hidden-links">
      {processedWords.map((word, index) => (
        React.isValidElement(word) 
          ? word 
          : <React.Fragment key={`word-${index}`}>{word}{' '}</React.Fragment>
      ))}
    </p>
  );
};

export default TextWithHiddenLinks; 