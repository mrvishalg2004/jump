const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    unique: true
  },
  username: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Playing', 'Qualified for Round 2', 'Failed'],
    default: 'Playing'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  timeTaken: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Player', PlayerSchema); 