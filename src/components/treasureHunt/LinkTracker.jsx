import React, { useState, useEffect } from 'react';
import { getLinkLocations, getDecoyDestinations, generateHash } from '../../utils/linkHider';
import './LinkTracker.css';

/**
 * LinkTracker Component
 * 
 * This component displays information about hidden links for the admin panel.
 * It shows the locations of all links and which ones are real links to Round 2.
 */
const LinkTracker = ({ players = [] }) => {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [linkLocations, setLinkLocations] = useState([]);
  const [decoyDestinations, setDecoyDestinations] = useState([]);
  const [playerLinks, setPlayerLinks] = useState([]);
  const [clickedLinks, setClickedLinks] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [viewMode, setViewMode] = useState('global'); // 'player' or 'global' - default to global view
  const [globalViewType, setGlobalViewType] = useState('direct'); // 'table', 'visual', or 'direct'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterPage, setFilterPage] = useState('all');
  const [highlightedLinkId, setHighlightedLinkId] = useState(null);
  
  // Load link locations and decoy destinations
  useEffect(() => {
    setLinkLocations(getLinkLocations());
    setDecoyDestinations(getDecoyDestinations());
    
    // Add resize listener for responsive design
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Calculate player links when a player is selected
  useEffect(() => {
    if (selectedPlayer && linkLocations.length > 0) {
      const playerId = selectedPlayer.playerId;
      const hash = generateHash(playerId);
      
      // Calculate which links are visible and which one is real
      const links = linkLocations.map(location => {
        const locationIndex = linkLocations.findIndex(
          loc => loc.page === location.page && 
                 loc.section === location.section && 
                 loc.position === location.position
        );
        
        // Use 1/3 ratio for visibility to match the linkHider.js implementation
        const isVisible = (hash + locationIndex) % 3 === 0;
        const isReal = isVisible && (hash + locationIndex) % linkLocations.length === hash % linkLocations.length;
        
        let destination = '/treasureHunt/round2';
        if (!isReal && isVisible) {
          const decoyIndex = (hash + locationIndex) % decoyDestinations.length;
          destination = decoyDestinations[decoyIndex];
        }
        
        return {
          ...location,
          isVisible,
          isReal,
          destination: isVisible ? destination : null,
          linkId: `link-${playerId}-${location.page}-${location.section}-${location.position}`
        };
      });
      
      setPlayerLinks(links);
      
      // Fetch clicked links for this player
      fetchClickedLinks(playerId);
    } else {
      setPlayerLinks([]);
      setClickedLinks([]);
    }
  }, [selectedPlayer, linkLocations, decoyDestinations]);
  
  // Fetch clicked links for a player
  const fetchClickedLinks = async (playerId) => {
    try {
      const apiPort = localStorage.getItem('apiPort') || '5005';
      const response = await fetch(`http://localhost:${apiPort}/api/players/link-clicks/${playerId}`);
      const data = await response.json();
      
      if (data.success) {
        setClickedLinks(data.clicks || []);
      } else {
        console.error('Error fetching link clicks:', data.message);
        setClickedLinks([]);
      }
    } catch (error) {
      console.error('Error fetching link clicks:', error);
      setClickedLinks([]);
    }
  };
  
  // Check if a link has been clicked
  const hasLinkBeenClicked = (linkId) => {
    return clickedLinks.some(click => click.linkId === linkId);
  };
  
  // Get the timestamp of when a link was clicked
  const getLinkClickTime = (linkId) => {
    const click = clickedLinks.find(click => click.linkId === linkId);
    return click ? new Date(click.timestamp).toLocaleString() : null;
  };
  
  // Render a table cell with proper formatting
  const renderCell = (content) => (
    <div className="cell-content" title={typeof content === 'string' ? content : ''}>
      {content}
    </div>
  );

  // Group link locations by page
  const groupedLocations = linkLocations.reduce((acc, location) => {
    if (!acc[location.page]) {
      acc[location.page] = [];
    }
    acc[location.page].push(location);
    return acc;
  }, {});
  
  // Get a color for a section based on its name (for visual consistency)
  const getSectionColor = (sectionName) => {
    const colors = {
      'header': '#4285F4',
      'footer': '#34A853',
      'mission': '#FBBC05',
      'team': '#EA4335',
      'form': '#9C27B0',
      'map': '#00BCD4',
      'list': '#FF9800',
      'details': '#795548',
      'plans': '#607D8B',
      'faq': '#E91E63',
      'articles': '#3F51B5',
      'sidebar': '#009688'
    };
    
    return colors[sectionName] || '#1eb2a6';
  };
  
  // Get position coordinates for visual map
  const getPositionCoordinates = (position) => {
    const positions = {
      'top': { top: '10%', left: '50%' },
      'bottom': { top: '90%', left: '50%' },
      'left': { top: '50%', left: '10%' },
      'right': { top: '50%', left: '90%' },
      'middle': { top: '50%', left: '50%' }
    };
    
    return positions[position] || { top: '50%', left: '50%' };
  };

  // Copy link ID pattern to clipboard
  const copyLinkIdToClipboard = (linkIdPattern) => {
    navigator.clipboard.writeText(linkIdPattern)
      .then(() => {
        alert('Link ID pattern copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };
  
  // Filter link locations based on search term and filters
  const getFilteredLinkLocations = () => {
    return linkLocations.filter(location => {
      const matchesSearch = searchTerm === '' || 
        location.page.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.position.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSection = filterSection === 'all' || location.section === filterSection;
      const matchesPage = filterPage === 'all' || location.page === filterPage;
      
      return matchesSearch && matchesSection && matchesPage;
    });
  };

  // Get unique sections and pages for filters
  const getUniqueSections = () => {
    return ['all', ...new Set(linkLocations.map(location => location.section))];
  };
  
  const getUniquePages = () => {
    return ['all', ...new Set(linkLocations.map(location => location.page))];
  };

  // Highlight a link location
  const highlightLink = (linkId) => {
    setHighlightedLinkId(linkId);
    setTimeout(() => setHighlightedLinkId(null), 2000);
  };

  // Generate a preview link for testing
  const generatePreviewLink = (location, playerId = 'preview') => {
    return `link-${playerId}-${location.page}-${location.section}-${location.position}`;
  };

  return (
    <div className={`link-tracker ${isMobile ? 'mobile-view' : ''}`}>
      <h2>Hidden Links Tracker</h2>
      
      <div className="view-mode-selector">
        <button 
          className={`view-mode-btn ${viewMode === 'global' ? 'active' : ''}`}
          onClick={() => setViewMode('global')}
        >
          Global View (All Links)
        </button>
        <button 
          className={`view-mode-btn ${viewMode === 'player' ? 'active' : ''}`}
          onClick={() => setViewMode('player')}
        >
          Player View
        </button>
      </div>
      
      {viewMode === 'player' ? (
        <>
          <div className="player-selector">
            <label htmlFor="player-select">Select a player:</label>
            <select 
              id="player-select" 
              value={selectedPlayer ? selectedPlayer.playerId : ''}
              onChange={(e) => {
                const playerId = e.target.value;
                const player = players.find(p => p.playerId === playerId);
                setSelectedPlayer(player || null);
              }}
            >
              <option value="">-- Select a player --</option>
              {players.map(player => (
                <option key={player.playerId} value={player.playerId}>
                  {player.username} ({player.playerId})
                </option>
              ))}
            </select>
          </div>
          
          {selectedPlayer ? (
            <div className="player-links">
              <h3>Links for {selectedPlayer.username}</h3>
              
              <div className="links-summary">
                <div className="summary-item">
                  <span className="summary-label">Total Links:</span>
                  <span className="summary-value">{linkLocations.length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Visible Links:</span>
                  <span className="summary-value">{playerLinks.filter(link => link.isVisible).length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Real Links:</span>
                  <span className="summary-value">{playerLinks.filter(link => link.isReal).length}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Clicked Links:</span>
                  <span className="summary-value">{clickedLinks.length}</span>
                </div>
              </div>
              
              <div className={`links-table-container ${isMobile ? 'mobile-scroll' : ''}`}>
                {isMobile && (
                  <div className="scroll-hint">Swipe horizontally to see all columns</div>
                )}
                <table className="links-table" cellSpacing="0" cellPadding="0">
                  <thead>
                    <tr>
                      <th>{renderCell("Page")}</th>
                      <th>{renderCell("Section")}</th>
                      <th>{renderCell("Position")}</th>
                      <th>{renderCell("Visible")}</th>
                      <th>{renderCell("Type")}</th>
                      <th>{renderCell("Destination")}</th>
                      <th>{renderCell("Clicked")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerLinks.map((link, index) => {
                      const linkClicked = hasLinkBeenClicked(link.linkId);
                      const clickTime = getLinkClickTime(link.linkId);
                      
                      return (
                        <tr 
                          key={index} 
                          className={`
                            ${link.isVisible ? 'visible-link' : 'hidden-link'}
                            ${link.isReal ? 'real-link' : ''}
                            ${linkClicked ? 'clicked-link' : ''}
                          `}
                        >
                          <td>{renderCell(link.page)}</td>
                          <td>{renderCell(link.section)}</td>
                          <td>{renderCell(link.position)}</td>
                          <td>{renderCell(link.isVisible ? 'Yes' : 'No')}</td>
                          <td>{renderCell(link.isReal ? 'REAL' : (link.isVisible ? 'Decoy' : 'N/A'))}</td>
                          <td>{renderCell(link.destination || 'N/A')}</td>
                          <td>
                            {renderCell(
                              linkClicked ? (
                                <span className="clicked-time" title={clickTime}>
                                  Yes
                                </span>
                              ) : 'No'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {playerLinks.filter(link => link.isReal).length > 0 && (
                <div className="real-link-info">
                  <h4>Real Link Location:</h4>
                  {playerLinks.filter(link => link.isReal).map((link, index) => (
                    <div key={index} className="real-link-details">
                      <p>
                        <strong>Page:</strong> {link.page} | 
                        <strong>Section:</strong> {link.section} | 
                        <strong>Position:</strong> {link.position}
                      </p>
                      <p>
                        <strong>Link ID:</strong> {link.linkId}
                      </p>
                      <p>
                        <strong>Clicked:</strong> {hasLinkBeenClicked(link.linkId) ? 'Yes' : 'No'}
                        {hasLinkBeenClicked(link.linkId) && (
                          <span> (at {getLinkClickTime(link.linkId)})</span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="no-player-selected">
              <p>Select a player to view their hidden links.</p>
            </div>
          )}
        </>
      ) : (
        <div className="global-links-view">
          <h3>All Possible Link Locations</h3>
          
          <div className="links-summary">
            <div className="summary-item">
              <span className="summary-label">Total Pages:</span>
              <span className="summary-value">{Object.keys(groupedLocations).length}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Total Link Locations:</span>
              <span className="summary-value">{linkLocations.length}</span>
            </div>
          </div>
          
          <div className="search-filter-container">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search links by page, section, or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button 
                  className="clear-search-btn" 
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="filter-controls">
              <div className="filter-select">
                <label htmlFor="section-filter">Section:</label>
                <select 
                  id="section-filter" 
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  {getUniqueSections().map(section => (
                    <option key={section} value={section}>
                      {section === 'all' ? 'All Sections' : section}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-select">
                <label htmlFor="page-filter">Page:</label>
                <select 
                  id="page-filter" 
                  value={filterPage}
                  onChange={(e) => setFilterPage(e.target.value)}
                >
                  {getUniquePages().map(page => (
                    <option key={page} value={page}>
                      {page === 'all' ? 'All Pages' : page}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div className="view-toggle">
            <button 
              className={`view-toggle-btn ${globalViewType === 'direct' ? 'active' : ''}`} 
              onClick={() => setGlobalViewType('direct')}
            >
              Direct Links View
            </button>
            <button 
              className={`view-toggle-btn ${globalViewType === 'table' ? 'active' : ''}`} 
              onClick={() => setGlobalViewType('table')}
            >
              Table View
            </button>
            <button 
              className={`view-toggle-btn ${globalViewType === 'visual' ? 'active' : ''}`} 
              onClick={() => setGlobalViewType('visual')}
            >
              Visual Map
            </button>
          </div>
          
          {/* Direct Links View - ENHANCED */}
          <div className="direct-links-view" style={{ display: globalViewType === 'direct' ? 'block' : 'none' }}>
            <div className="direct-links-explanation">
              <p>
                <strong>This view shows all possible link locations in a direct, easy-to-understand format.</strong> 
                Each card represents a potential link location in the game. The link ID pattern shows how links are 
                constructed for each player. Use the search and filters above to find specific links.
              </p>
            </div>
            
            <div className="direct-links-container">
              {getFilteredLinkLocations().map((location, index) => {
                const previewLinkId = generatePreviewLink(location);
                return (
                  <div 
                    key={index} 
                    className={`link-location-card ${highlightedLinkId === previewLinkId ? 'highlight-card' : ''}`}
                  >
                    <div 
                      className="card-header" 
                      style={{ backgroundColor: getSectionColor(location.section) }}
                    >
                      <span className="location-page">{location.page.toUpperCase()}</span>
                      <span className="location-details">
                        {location.section} / {location.position}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="link-id-pattern">
                        <code>link-{'{playerId}'}-{location.page}-{location.section}-{location.position}</code>
                        <button 
                          className="copy-link-btn" 
                          onClick={() => copyLinkIdToClipboard(`link-{playerId}-${location.page}-${location.section}-${location.position}`)}
                          title="Copy link ID pattern"
                        >
                          📋
                        </button>
                      </div>
                      <div className="link-location-info">
                        <div className="info-item">
                          <span className="info-label">Page:</span>
                          <span className="info-value">{location.page}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Section:</span>
                          <span className="info-value">{location.section}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Position:</span>
                          <span className="info-value">{location.position}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Index:</span>
                          <span className="info-value">{index}</span>
                        </div>
                      </div>
                      
                      <div className="link-actions">
                        <button 
                          className="preview-link-btn"
                          onClick={() => highlightLink(previewLinkId)}
                          title="Highlight this link"
                        >
                          Highlight
                        </button>
                        
                        {players.length > 0 && (
                          <div className="player-test-dropdown">
                            <select 
                              onChange={(e) => {
                                if (e.target.value) {
                                  const player = players.find(p => p.playerId === e.target.value);
                                  if (player) {
                                    const hash = generateHash(player.playerId);
                                    const locationIndex = linkLocations.findIndex(
                                      loc => loc.page === location.page && 
                                            loc.section === location.section && 
                                            loc.position === location.position
                                    );
                                    const isVisible = (hash + locationIndex) % 3 === 0;
                                    const isReal = isVisible && (hash + locationIndex) % linkLocations.length === hash % linkLocations.length;
                                    
                                    alert(`For player ${player.username}:\nLink is ${isVisible ? 'VISIBLE' : 'NOT VISIBLE'}\n${isVisible ? (isReal ? 'This is the REAL LINK!' : 'This is a DECOY link') : ''}`);
                                  }
                                }
                              }}
                            >
                              <option value="">Test for player...</option>
                              {players.map(player => (
                                <option key={player.playerId} value={player.playerId}>
                                  {player.username}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {getFilteredLinkLocations().length === 0 && (
              <div className="no-results-message">
                <p>No link locations match your search criteria. Try adjusting your filters.</p>
              </div>
            )}
          </div>
          
          {/* Table View */}
          <div className="table-view" style={{ display: globalViewType === 'table' ? 'block' : 'none' }}>
            {Object.keys(groupedLocations).map(page => (
              <div key={page} className="page-links-section">
                <h4 className="page-title">{page.charAt(0).toUpperCase() + page.slice(1)} Page</h4>
                
                <div className={`links-table-container ${isMobile ? 'mobile-scroll' : ''}`}>
                  {isMobile && (
                    <div className="scroll-hint">Swipe horizontally to see all columns</div>
                  )}
                  <table className="links-table" cellSpacing="0" cellPadding="0">
                    <thead>
                      <tr>
                        <th>{renderCell("Section")}</th>
                        <th>{renderCell("Position")}</th>
                        <th>{renderCell("Link ID Pattern")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedLocations[page].map((location, index) => (
                        <tr key={index} className="global-link-row">
                          <td>{renderCell(location.section)}</td>
                          <td>{renderCell(location.position)}</td>
                          <td>{renderCell(`link-{playerId}-${location.page}-${location.section}-${location.position}`)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          
          {/* Visual Map View */}
          <div className="visual-map-view" style={{ display: globalViewType === 'visual' ? 'block' : 'none' }}>
            <div className="visual-map-container">
              {Object.keys(groupedLocations).map(page => (
                <div key={page} className="page-map">
                  <h4 className="page-title">{page.charAt(0).toUpperCase() + page.slice(1)} Page</h4>
                  <div className="page-layout">
                    {/* Visual representation of a webpage */}
                    <div className="page-header">Header</div>
                    <div className="page-content">
                      <div className="page-sidebar">Sidebar</div>
                      <div className="page-main">Main Content</div>
                    </div>
                    <div className="page-footer">Footer</div>
                    
                    {/* Link dots */}
                    {groupedLocations[page].map((location, index) => {
                      const coords = getPositionCoordinates(location.position);
                      return (
                        <div 
                          key={index}
                          className="link-dot"
                          style={{
                            top: coords.top,
                            left: coords.left,
                            backgroundColor: getSectionColor(location.section)
                          }}
                          title={`${location.section} - ${location.position}`}
                        >
                          <span className="link-dot-tooltip">
                            Section: {location.section}<br />
                            Position: {location.position}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="map-legend">
              <h4>Legend</h4>
              <div className="legend-items">
                {Object.keys(groupedLocations).flatMap(page => 
                  groupedLocations[page].map(loc => loc.section)
                ).filter((value, index, self) => self.indexOf(value) === index).map(section => (
                  <div key={section} className="legend-item">
                    <span 
                      className="legend-color" 
                      style={{ backgroundColor: getSectionColor(section) }}
                    ></span>
                    <span className="legend-label">{section}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="global-links-info">
            <h4>How Links Are Determined:</h4>
            <div className="links-info-content">
              <p>
                <strong>Visibility:</strong> For each player, links are made visible based on a hash of their player ID.
                Approximately 1/3 of all possible links are visible to each player.
              </p>
              <p>
                <strong>Real Link:</strong> Each player has exactly one real link that leads to Round 2.
                The real link is determined by a hash of the player's ID combined with the link location.
              </p>
              <p>
                <strong>Decoy Links:</strong> All other visible links are decoys that lead to decoy pages.
              </p>
              <p>
                <strong>Link ID Format:</strong> <code>link-{'{playerId}'}-{'{page}'}-{'{section}'}-{'{position}'}</code>
              </p>
              
              <div className="link-testing-guide">
                <h5>Testing Links for Players:</h5>
                <ol>
                  <li>Use the "Test for player" dropdown in any link card to check if that link is visible and real for a specific player</li>
                  <li>Switch to "Player View" to see all links for a specific player, including which one is real</li>
                  <li>Use the search and filters to quickly find links on specific pages or sections</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkTracker; 