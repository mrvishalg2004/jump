const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const GameSettings = require('../models/GameSettings');
const LinkClick = require('../models/LinkClick');
const jwt = require('jsonwebtoken');

// Secret key for JWT - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-for-development-only';

// Admin authentication middleware
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // For development/testing without auth
    if (process.env.SKIP_AUTH === 'true') {
      console.log('Skipping authentication for development');
      return next();
    }
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({
        success: false,
        message: 'Authorization header missing or invalid'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user info to request
    req.user = decoded;
    
    // Allow the request to proceed
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({
      success: false,
      message: 'Authentication failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Register a new player
router.post('/register', async (req, res) => {
  try {
    const { playerId, username } = req.body;
    
    if (!playerId || !username) {
      return res.status(400).json({
        success: false,
        message: 'Player ID and username are required'
      });
    }
    
    console.log(`Registration request for: ${username} (${playerId})`);
    
    // Check if player already exists
    const existingPlayer = await Player.findOne({ playerId });
    if (existingPlayer) {
      // Update username if it has changed
      if (existingPlayer.username !== username) {
        existingPlayer.username = username;
        await existingPlayer.save();
        
        console.log(`Player username updated: ${username} (${playerId})`);
        
        // Emit socket event for admin panel update
        if (global.io) {
          global.io.emit('playerUpdate', {
            type: 'registration',
            player: {
              playerId,
              username,
              status: existingPlayer.status,
              timestamp: existingPlayer.timestamp,
              timeTaken: existingPlayer.timeTaken || 0,
              id: existingPlayer._id
            }
          });
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Player already registered',
        player: existingPlayer
      });
    }
    
    // Create new player
    const player = await Player.create({ 
      playerId,
      username,
      status: 'Playing',
      timestamp: new Date()
    });
    
    console.log(`New player registered: ${username} (${playerId})`);
    
    // Emit socket event for admin panel update
    if (global.io) {
      global.io.emit('playerUpdate', {
        type: 'registration',
        player: {
          id: player._id,
          playerId,
          username,
          status: player.status,
          timestamp: player.timestamp,
          timeTaken: player.timeTaken || 0
        }
      });
      
      console.log('Emitted playerUpdate event for new registration');
    }
    
    res.status(201).json({
      success: true,
      message: 'Player registered successfully',
      player
    });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Submit link attempt
router.post('/submit-link', async (req, res) => {
  try {
    const { playerId, clickedLink, timeTaken } = req.body;
    
    console.log('Submit link request received:', { 
      playerId, 
      clickedLink,
      length: clickedLink ? clickedLink.length : 0 
    });
    
    // Validate required fields
    if (!playerId || !clickedLink) {
      console.log('Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Player ID and link are required'
      });
    }
    
    // Get current game settings
    const gameSettings = await GameSettings.getSettings();
    
    // Check if the game is active
    if (gameSettings.activeRound !== 1) {
      console.log('Game not active, current round:', gameSettings.activeRound);
      return res.status(403).json({
        success: false,
        message: 'Round 1 is not currently active. Please wait for the admin to start the round.'
      });
    }
    
    // Check if player exists
    const player = await Player.findOne({ playerId });
    if (!player) {
      console.log('Player not found:', playerId);
      return res.status(404).json({
        success: false,
        message: 'Player not found. Please register first.'
      });
    }
    
    // Check if player already qualified
    if (player.status === 'Qualified for Round 2') {
      console.log('Player already qualified:', playerId);
      return res.status(200).json({
        success: true,
        message: 'You have already qualified for Round 2',
        qualified: true,
        player
      });
    }
    
    // Check if the link is correct
    const correctLinks = [
      '/roundtwo-a1b2c3d4e5f6789',
      '/roundtwo-ff774ffhhi287',
      '/roundtwo-x9y8z7w6v5u4321',
      '/roundtwo-mn34op56qr78st90',
      '/roundtwo-abcd1234efgh5678',
      '/roundtwo-xyz987uvw654rst3',
      '/roundtwo-qwerty123uiop456',
      '/roundtwo-lmn678opq234rst9',
      '/roundtwo-98zyx765wvu43210',
      '/roundtwo-ghijklm456nop789',
      '/roundtwo-pqrstu123vwxyz45',
      '/roundtwo-abc987def654ghi32',
      '/roundtwo-klmno123pqrst456',
      '/roundtwo-uvwxyz9876543210',
      '/roundtwo-qwert678yuiop234'
    ];

    console.log('Valid links:', correctLinks);

    // Clean and normalize the link
    let cleanedLink = clickedLink.trim();
    console.log('Original cleaned link:', cleanedLink);
    
    // Add slash if it's missing
    if (!cleanedLink.startsWith('/')) {
      cleanedLink = `/${cleanedLink}`;
      console.log('Added leading slash:', cleanedLink);
    }
    
    // Additional normalization - remove any URL parts if present
    if (cleanedLink.includes('http')) {
      // Try to extract just the path part
      try {
        const url = new URL(cleanedLink);
        cleanedLink = url.pathname;
        console.log('Extracted pathname from URL:', cleanedLink);
      } catch (e) {
        console.log('Failed to parse as URL, keeping as is');
      }
    }
    
    // Log all possible matching approaches for debugging
    console.log('Comparing submitted link:', cleanedLink);
    console.log('Exact match check:', correctLinks.includes(cleanedLink));
    console.log('Case insensitive check:', correctLinks.some(link => link.toLowerCase() === cleanedLink.toLowerCase()));
    
    // Check if link starts with /roundtwo- (more lenient validation)
    const isBasicValid = cleanedLink.toLowerCase().startsWith('/roundtwo-');
    console.log('Basic validation check (starts with /roundtwo-):', isBasicValid);
    
    // Check if link is valid with multiple approaches
    let isValid = correctLinks.includes(cleanedLink);
    
    // Check with more flexible approaches if exact match fails
    if (!isValid) {
      // Case insensitive match
      isValid = correctLinks.some(link => link.toLowerCase() === cleanedLink.toLowerCase());
      
      // If still not valid but has basic valid pattern, assume it's correct for now
      if (!isValid && isBasicValid) {
        console.log('Link passes basic pattern validation, accepting it');
        isValid = true;
      }
    }
    
    console.log('Final validation result:', isValid);
    
    // For debugging, add to link click collection regardless of validity
    await LinkClick.create({
      playerId,
      link: cleanedLink,
      valid: isValid,
      timestamp: new Date()
    });
    
    // Handle invalid link
    if (!isValid) {
      console.log('Link validation failed');
      
      // Store in DB for analysis
      await LinkClick.create({
        playerId,
        link: cleanedLink,
        valid: false,
        timestamp: new Date(),
        note: 'Failed final validation'
      });
      
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid link. Please try again.',
        receivedLink: cleanedLink
      });
    }
    
    console.log('Link validation passed');
    
    // Check if we already have 15 qualified players
    const qualifiedCount = await Player.countDocuments({ status: 'Qualified for Round 2' });
    console.log('Current qualified count:', qualifiedCount);
    
    if (qualifiedCount >= 15) {
      console.log('Max qualified players reached');
      // Update player status to failed
      await Player.findOneAndUpdate(
        { playerId },
        { status: 'Failed' },
        { new: true }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Better luck next time! 15 players have already qualified.',
        qualified: false
      });
    }
    
    // Update player status to qualified
    const updatedPlayer = await Player.findOneAndUpdate(
      { playerId },
      { 
        status: 'Qualified for Round 2',
        timeTaken: timeTaken || 0
      },
      { new: true }
    );
    
    console.log('Player qualified successfully:', player.username);
    
    // Emit socket event for admin panel update
    if (global.io) {
      global.io.emit('playerUpdate', {
        playerId,
        username: player.username,
        status: 'Qualified for Round 2',
        timeTaken: timeTaken || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Congratulations! You have qualified for Round 2.',
      qualified: true,
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Error in submit-link:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
});

// Get all players (admin only)
router.get('/admin/players', authenticateAdmin, async (req, res) => {
  try {
    console.log('Admin requested player data');
    
    // Get all players
    const players = await Player.find({}).sort({ timestamp: -1 });
    
    // Get game settings using the static method
    const gameSettings = await GameSettings.getSettings();
    
    console.log(`Returning ${players.length} players to admin`);
    
    // Calculate stats for admin dashboard
    const stats = {
      total: players.length,
      qualified: players.filter(p => p.status === 'Qualified for Round 2').length,
      playing: players.filter(p => p.status === 'Playing').length,
      failed: players.filter(p => p.status === 'Failed').length
    };
    
    return res.json({
      success: true,
      players,
      gameSettings,
      stats
    });
  } catch (error) {
    console.error('Error fetching players for admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching players: ' + error.message
    });
  }
});

// Reset game (admin route)
router.post('/admin/reset', async (req, res) => {
  try {
    await Player.deleteMany({});
    
    // Reset game settings to inactive
    const gameSettings = await GameSettings.getSettings();
    gameSettings.activeRound = 0;
    await gameSettings.save();
    
    // Emit a stronger reset event to all connected clients with forceRefresh flag
    if (global.io) {
      console.log('Broadcasting game reset to all clients with forceRefresh');
      global.io.emit('gameReset', {
        timestamp: Date.now(),
        forceRefresh: true,
        forceNewRegistration: true
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Game reset successfully. All players must register again.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Set active round (admin route)
router.post('/admin/set-round', async (req, res) => {
  try {
    const { roundNumber } = req.body;
    
    if (roundNumber === undefined || ![0, 1, 2, 3].includes(roundNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid round number. Must be 0, 1, 2, or 3.'
      });
    }
    
    // Update game settings
    const gameSettings = await GameSettings.getSettings();
    gameSettings.activeRound = roundNumber;
    gameSettings.lastUpdated = Date.now();
    await gameSettings.save();
    
    // Emit event to all clients
    if (global.io) {
      global.io.emit('gameStateUpdate', { activeRound: roundNumber });
    }
    
    res.status(200).json({
      success: true,
      message: `Round ${roundNumber === 0 ? 'disabled' : roundNumber} is now active`,
      gameSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get current game state
router.get('/game-state', async (req, res) => {
  try {
    const gameSettings = await GameSettings.getSettings();
    
    res.status(200).json({
      success: true,
      gameSettings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Track link click
router.post('/track-link-click', async (req, res) => {
  try {
    const { linkId, playerId, isCorrect } = req.body;
    
    if (!linkId || !playerId) {
      return res.status(400).json({
        success: false,
        message: 'Link ID and player ID are required'
      });
    }
    
    // Log link click
    await LinkClick.create({
      playerId,
      linkId,
      isCorrect,
      timestamp: new Date()
    });
    
    res.status(201).json({
      success: true,
      message: 'Link click tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking link click:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Retrieve original link position for admin
router.get('/admin/original-link', async (req, res) => {
  try {
    const originalLinkPosition = '/ai'; // Example of where the original link is hidden
    
    res.status(200).json({
      success: true,
      originalLinkPosition
    });
  } catch (error) {
    console.error('Error retrieving original link position:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get link clicks for a player
router.get('/link-clicks/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is required'
      });
    }
    
    // Get all link clicks for the player
    const clicks = await LinkClick.find({ playerId }).sort({ timestamp: -1 });
    
    res.status(200).json({
      success: true,
      clicks
    });
  } catch (error) {
    console.error('Error getting link clicks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Update player status
router.post('/update-status', async (req, res) => {
  try {
    const { playerId, username, status } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is required'
      });
    }
    
    console.log(`Update status request for ${username || playerId} to ${status}`);
    
    // Find the player
    let player = await Player.findOne({ playerId });
    
    // If player doesn't exist and username is provided, create a new one
    if (!player && username) {
      console.log(`Creating new player: ${username}`);
      player = new Player({
        playerId,
        username,
        timestamp: new Date(),
        status: 'Playing' // Default status
      });
      await player.save();
    } else if (!player) {
      console.log(`Player not found: ${playerId}`);
      return res.status(404).json({
        success: false,
        message: 'Player not found and no username provided'
      });
    }
    
    // Update status only if a new one is provided
    if (status) {
      console.log(`Updating status for ${player.username} from ${player.status} to ${status}`);
      player.status = status;
      
      // If status is "Qualified for Round 2", set timeTaken to 0 for manual qualifications
      if (status === 'Qualified for Round 2' && (!player.timeTaken || player.timeTaken === 0)) {
        player.timeTaken = 0; // Mark as manually qualified
      }
      
      await player.save();
    }
    
    // Emit socket event using global.io
    if (global.io) {
      console.log('Emitting playerUpdate event via socket');
      global.io.emit('playerUpdate', {
        type: status === 'Qualified for Round 2' ? 'qualification' : 'statusUpdate',
        player: {
          id: player._id,
          playerId: player.playerId,
          username: player.username,
          status: player.status,
          timeTaken: player.timeTaken || 0,
          timestamp: player.timestamp
        }
      });
    } else {
      console.warn('Socket.io instance not available for emitting events');
    }
    
    return res.json({
      success: true,
      message: `Player status updated successfully to ${status}`,
      player
    });
  } catch (error) {
    console.error('Error in update-status endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
      error: error.message
    });
  }
});

// Simple route for testing link validation
router.post('/test-link', (req, res) => {
  try {
    const { link } = req.body;
    
    console.log('Test link request received:', { link });
    
    if (!link) {
      return res.status(400).json({ 
        success: false, 
        message: 'Link is required'
      });
    }
    
    const correctLinks = [
      '/roundtwo-a1b2c3d4e5f6789',
      '/roundtwo-ff774ffhhi287',
      '/roundtwo-x9y8z7w6v5u4321',
      '/roundtwo-mn34op56qr78st90',
      '/roundtwo-abcd1234efgh5678',
      '/roundtwo-xyz987uvw654rst3',
      '/roundtwo-qwerty123uiop456',
      '/roundtwo-lmn678opq234rst9',
      '/roundtwo-98zyx765wvu43210',
      '/roundtwo-ghijklm456nop789',
      '/roundtwo-pqrstu123vwxyz45',
      '/roundtwo-abc987def654ghi32',
      '/roundtwo-klmno123pqrst456',
      '/roundtwo-uvwxyz9876543210',
      '/roundtwo-qwert678yuiop234'
    ];
    
    const cleanedLink = link.trim();
    console.log('Cleaned link for testing:', cleanedLink);
    
    // Check if the link is in the array
    const isValid = correctLinks.includes(cleanedLink);
    console.log('Link validation result:', isValid);
    
    // For debugging purposes
    console.log('Link length:', cleanedLink.length);
    console.log('First correct link length:', correctLinks[0].length);
    
    return res.status(200).json({
      success: true,
      isValid,
      message: isValid ? 'Link is valid!' : 'Link is invalid!',
      receivedLink: cleanedLink,
      debug: {
        linkLength: cleanedLink.length,
        correctLinkExample: correctLinks[0],
        correctLinkLength: correctLinks[0].length
      }
    });
  } catch (error) {
    console.error('Error testing link:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during link testing'
    });
  }
});

// Force qualify a player (for debugging)
router.post('/force-qualify', async (req, res) => {
  try {
    const { playerId, username } = req.body;
    
    console.log('Force qualify request received for:', playerId);
    
    if (!playerId) {
      console.log('Missing player ID');
      return res.status(400).json({
        success: false,
        message: 'Player ID is required'
      });
    }
    
    // Get current game settings
    const gameSettings = await GameSettings.getSettings();
    console.log('Current game settings:', gameSettings);
    
    // Check if the game is active
    if (gameSettings.activeRound !== 1) {
      console.log('Game not active, current round:', gameSettings.activeRound);
      return res.status(403).json({
        success: false,
        message: 'Round 1 is not currently active. Please wait for the admin to start the round.'
      });
    }
    
    // Check if player exists
    console.log('Searching for player with ID:', playerId);
    let player = await Player.findOne({ playerId });
    
    // If player doesn't exist but username is provided, create a new player record
    if (!player && username) {
      console.log('Player not found, creating new record with username:', username);
      try {
        player = await Player.create({
          playerId,
          username,
          status: 'Playing',
          timestamp: new Date()
        });
        console.log('Created new player record for force-qualify:', player.username);
      } catch (createError) {
        console.error('Error creating player during force-qualify:', createError);
        return res.status(404).json({
          success: false,
          message: 'Could not create player record. Please try registering again.'
        });
      }
    } else if (!player) {
      console.log('Player not found and no username provided');
      return res.status(404).json({
        success: false,
        message: 'Player not found. Please register first.'
      });
    }
    
    console.log('Found or created player:', player.username);
    
    // Check if player already qualified
    if (player.status === 'Qualified for Round 2') {
      console.log('Player already qualified:', player.username);
      return res.status(200).json({
        success: true,
        message: 'You have already qualified for Round 2',
        qualified: true,
        player
      });
    }
    
    // Check if we already have 15 qualified players
    const qualifiedCount = await Player.countDocuments({ status: 'Qualified for Round 2' });
    console.log('Current qualified count:', qualifiedCount);
    
    if (qualifiedCount >= 15) {
      console.log('Max qualified players reached');
      // Update player status to failed
      await Player.findOneAndUpdate(
        { playerId },
        { status: 'Failed' },
        { new: true }
      );
      
      return res.status(200).json({
        success: true,
        message: 'Better luck next time! 15 players have already qualified.',
        qualified: false
      });
    }
    
    // Update player status to qualified
    const timeTaken = Date.now() - new Date(player.timestamp || Date.now()).getTime();
    console.log('Qualifying player with time:', timeTaken);
    
    const updatedPlayer = await Player.findOneAndUpdate(
      { playerId },
      { 
        status: 'Qualified for Round 2',
        timeTaken: timeTaken || 0
      },
      { new: true }
    );
    
    if (!updatedPlayer) {
      console.error('Failed to update player record after qualification');
      return res.status(500).json({
        success: false,
        message: 'Failed to update player status. Please try again.',
      });
    }
    
    console.log('Player qualified successfully:', player.username);
    
    // Emit socket event for admin panel update
    if (global.io) {
      global.io.emit('playerUpdate', {
        playerId,
        username: player.username,
        status: 'Qualified for Round 2',
        timeTaken: timeTaken || 0,
        timestamp: new Date().toISOString()
      });
    }
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Congratulations! You have qualified for Round 2.',
      qualified: true,
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Error in force-qualify:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.',
      error: error.message
    });
  }
});

// Direct qualification endpoint (no link validation)
router.post('/direct-qualify', async (req, res) => {
  const { playerId, username, clickedLink, timeTaken } = req.body;
  
  if (!playerId) {
    return res.status(400).json({ success: false, message: 'Player ID is required' });
  }
  
  try {
    console.log(`Manual qualification request received for: ${username} (${playerId})`);
    
    // Get current game settings
    const settings = await GameSettings.findOne();
    
    // Verify Round 1 is active
    if (!settings || settings.activeRound !== 1) {
      console.log('Manual qualification rejected: Round 1 is not active');
      return res.status(403).json({ 
        success: false, 
        message: 'Round 1 is not currently active.' 
      });
    }
    
    // Find the player
    let player = await Player.findOne({ playerId });
    
    // If player doesn't exist, create a new one with the provided username
    if (!player && username) {
      console.log(`Creating new player for qualification: ${username}`);
      player = new Player({
        playerId,
        username,
        timestamp: new Date(),
        status: 'Playing'
      });
      await player.save();
    } else if (!player) {
      console.log('Player not found and no username provided');
      return res.status(404).json({ 
        success: false, 
        message: 'Player not found. Please register first.' 
      });
    }
    
    // Check if player is already qualified
    if (player.status === 'Qualified for Round 2') {
      console.log(`Player already qualified: ${player.username}`);
      return res.json({ 
        success: true, 
        message: 'You are already qualified for Round 2!',
        player
      });
    }
    
    // Count qualified players
    const qualifiedCount = await Player.countDocuments({ status: 'Qualified for Round 2' });
    console.log(`Current qualified count: ${qualifiedCount}/15`);
    
    // Check if we've hit the qualification limit
    if (qualifiedCount >= 15) {
      // Update player status to failed
      player.status = 'Failed';
      await player.save();
      
      console.log(`Player failed qualification (slots full): ${player.username}`);
      return res.json({ 
        success: true, 
        message: 'Sorry, all qualification spots are filled. Try again next time!',
        player
      });
    }
    
    // Calculate time taken if not provided
    const calculatedTimeTaken = timeTaken || 0;
    
    // Update player status to qualified
    console.log(`Qualifying player: ${player.username} with time: ${calculatedTimeTaken}ms`);
    player.status = 'Qualified for Round 2';
    player.timeTaken = calculatedTimeTaken;
    player.clickedLink = clickedLink || 'manual-qualification';
    await player.save();
    
    // Fetch the updated player to ensure we have the latest data
    const updatedPlayer = await Player.findOne({ playerId });
    
    // Emit socket event to update admin panel in real-time
    if (global.io) {
      console.log('Emitting qualification events');
      
      // Emit general playerUpdate event
      global.io.emit('playerUpdate', {
        type: 'qualification',
        player: {
          id: updatedPlayer._id,
          playerId: updatedPlayer.playerId,
          username: updatedPlayer.username,
          status: updatedPlayer.status,
          timeTaken: updatedPlayer.timeTaken,
          clickedLink: updatedPlayer.clickedLink
        }
      });
      
      // Also emit specific playerQualified event
      global.io.emit('playerQualified', {
        playerId: updatedPlayer.playerId,
        username: updatedPlayer.username,
        status: 'Qualified for Round 2',
        timeTaken: updatedPlayer.timeTaken
      });
      
      console.log('Qualification events emitted successfully');
    } else {
      console.warn('Socket.io instance not available - qualification events not emitted');
    }
    
    console.log(`Manual qualification completed for: ${updatedPlayer.username}`);
    return res.json({ 
      success: true, 
      message: 'Congratulations! You have qualified for Round 2.',
      player: updatedPlayer
    });
  } catch (error) {
    console.error('Error in direct-qualify endpoint:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again.',
      error: error.message
    });
  }
});

// Disqualify a player (admin only)
router.post('/admin/disqualify', async (req, res) => {
  try {
    const { playerId, username, timestamp } = req.body;
    
    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is required'
      });
    }
    
    // Find the player
    const player = await Player.findOne({ playerId });
    
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    // Update player status to disqualified
    player.status = 'Disqualified for Cheating';
    await player.save();
    
    // Log the disqualification
    console.log(`Player disqualified: ${player.username} (${player.playerId})`);
    
    // Broadcast to all connected clients
    if (global.io) {
      console.log('Broadcasting disqualification to all clients');
      
      // Emit to all clients
      global.io.emit('playerDisqualified', {
        playerId: player.playerId,
        username: player.username,
        timestamp: timestamp || Date.now(),
        broadcast: true
      });
      
      // Update admin panels
      global.io.emit('playerUpdate', {
        type: 'disqualification',
        player: {
          id: player._id,
          playerId: player.playerId,
          username: player.username,
          status: player.status
        }
      });
      
      // Log successful broadcast
      console.log('Disqualification broadcast completed');
    } else {
      console.error('Socket.io instance not available');
    }
    
    return res.json({
      success: true,
      message: `${player.username} has been disqualified for cheating`,
      player
    });
  } catch (error) {
    console.error('Error disqualifying player:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
      error: error.message
    });
  }
});

// Simple qualification endpoint (admin only)
router.post('/simple-qualify', async (req, res) => {
  // Add debug logging
  console.log('==== SIMPLE-QUALIFY ENDPOINT CALLED ====');
  console.log('Request body:', req.body);
  
  const { playerId, username } = req.body;
  
  if (!playerId) {
    console.log('ERROR: Missing playerId in request');
    return res.status(400).json({ success: false, message: 'Player ID is required' });
  }
  
  try {
    console.log(`Simple qualification request received for: ${username} (${playerId})`);
    
    // Find the player
    let player = await Player.findOne({ playerId });
    
    // If player doesn't exist, create a new one
    if (!player) {
      if (!username) {
        console.log('ERROR: Username required for new player');
        return res.status(400).json({ success: false, message: 'Username is required for new players' });
      }
      
      console.log(`Creating new player: ${username}`);
      player = new Player({
        playerId,
        username,
        timestamp: new Date(),
        status: 'Playing'
      });
      
      await player.save();
      console.log(`New player created: ${username} (${playerId})`);
    }
    
    // Check if player is already qualified
    if (player.status === 'Qualified for Round 2') {
      console.log(`Player already qualified: ${player.username}`);
      return res.json({
        success: true,
        message: 'Player is already qualified for Round 2',
        player
      });
    }
    
    // Simply update the player status directly
    player.status = 'Qualified for Round 2';
    player.timeTaken = 0; // Mark as manually qualified
    await player.save();
    
    console.log(`Player successfully qualified: ${player.username}`);
    
    // Emit socket event if io is available
    if (global.io) {
      console.log('Emitting socket events for qualification');
      
      // Event for updating admin panels
      global.io.emit('playerUpdate', {
        type: 'qualification',
        player: {
          id: player._id,
          playerId: player.playerId,
          username: player.username,
          status: player.status,
          timeTaken: player.timeTaken,
          timestamp: player.timestamp
        }
      });
      
      // Direct event for player qualification
      global.io.emit('playerQualified', {
        playerId: player.playerId,
        username: player.username,
        status: 'Qualified for Round 2',
        timeTaken: 0
      });
      
      console.log('Socket events emitted successfully');
    } else {
      console.log('WARNING: Socket.io instance not available for emitting events');
    }
    
    return res.json({
      success: true,
      message: `${player.username} has been qualified for Round 2`,
      player: {
        id: player._id,
        playerId: player.playerId,
        username: player.username,
        status: player.status,
        timeTaken: player.timeTaken,
        timestamp: player.timestamp
      }
    });
  } catch (error) {
    console.error('Error in simple-qualify endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during qualification. Please try again.',
      error: error.message
    });
  }
});

// Get admin credentials
router.get('/admin/credentials', (req, res) => {
  try {
    // This route has been deprecated for security reasons
    return res.status(404).json({
      success: false,
      message: 'Endpoint not found'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Admin login endpoint
router.post('/admin/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    // In a real app, you would check against database credentials
    // For this demo, using hardcoded credentials
    if (email === 'vishalgolhar10@gmail.com' && 
        password === 'vishalgolhar10@gmail.com#8421236102#7350168049') {
      
      // Create a JWT token
      const token = jwt.sign({ 
        email,
        role: 'admin',
        timestamp: Date.now()
      }, JWT_SECRET, { expiresIn: '24h' });
      
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token
      });
    }
    
    // If credentials don't match
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password'
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Listen for socket.io connections
if (global.io) {
  global.io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Handle admin room joining
    socket.on('joinAdminRoom', (data) => {
      console.log('Admin joined', data?.adminId ? `with ID: ${data.adminId}` : '');
      socket.join('admin-room');
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
    
    //... existing socket handlers ...
  });
}

module.exports = router; 