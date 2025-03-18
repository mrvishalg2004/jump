const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const GameSettings = require('../models/GameSettings');
const LinkClick = require('../models/LinkClick');
const { io } = require('../server');

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
    
    // Check if player already exists
    const existingPlayer = await Player.findOne({ playerId });
    if (existingPlayer) {
      // Update username if it has changed
      if (existingPlayer.username !== username) {
        existingPlayer.username = username;
        await existingPlayer.save();
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
      status: 'Playing'
    });
    
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
    
    // Get current game settings
    const gameSettings = await GameSettings.getSettings();
    
    // Check if the game is active
    if (gameSettings.activeRound !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Round 1 is not currently active. Please wait for the admin to start the round.'
      });
    }
    
    // Check if the link is correct
    if (clickedLink !== '/round2') {
      return res.status(400).json({ 
        success: false, 
        message: 'Wrong link! Try again in 5 seconds.'
      });
    }
    
    // Check if player exists
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    // Check if player already qualified
    if (player.status === 'Qualified for Round 2') {
      return res.status(200).json({
        success: true,
        message: 'You have already qualified for Round 2',
        qualified: true,
        player
      });
    }
    
    // Check if we already have 15 qualified players
    const qualifiedCount = await Player.countDocuments({ status: 'Qualified for Round 2' });
    if (qualifiedCount >= 15) {
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
        timeTaken
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Congratulations! You have qualified for Round 2.',
      qualified: true,
      player: updatedPlayer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get all players (admin only)
router.get('/admin/players', async (req, res) => {
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
    
    res.status(200).json({
      success: true,
      message: 'Game reset successfully'
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
    if (io) {
      io.emit('gameStateUpdate', { activeRound: roundNumber });
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
    const { playerId, status } = req.body;
    
    // Find the player by ID
    const player = await Player.findOne({ playerId });
    if (!player) {
      return res.status(404).json({
        success: false,
        message: 'Player not found'
      });
    }
    
    // Update the player's status
    player.status = status;
    await player.save();
    
    // Emit event to admin panel
    io.to('adminRoom').emit('playerUpdate', { playerId, username: player.username, status });
    
    res.status(200).json({
      success: true,
      message: 'Player status updated successfully'
    });
  } catch (error) {
    console.error('Error updating player status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 