const mongoose = require('mongoose');

const LinkClickSchema = new mongoose.Schema({
  playerId: {
    type: String,
    required: true,
    index: true
  },
  linkId: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRealLink: {
    type: Boolean,
    default: false
  }
});

// Create a compound index for playerId and linkId
LinkClickSchema.index({ playerId: 1, linkId: 1 }, { unique: true });

module.exports = mongoose.model('LinkClick', LinkClickSchema); 