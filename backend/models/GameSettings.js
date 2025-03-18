const mongoose = require('mongoose');

const GameSettingsSchema = new mongoose.Schema({
  activeRound: {
    type: Number,
    enum: [0, 1, 2, 3], // 0 = no active round, 1-3 = round number
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Ensure there's only one settings document
GameSettingsSchema.statics.getSettings = async function() {
  const settings = await this.findOne();
  if (settings) {
    return settings;
  }
  
  // Create default settings if none exist
  return await this.create({ activeRound: 0 });
};

module.exports = mongoose.model('GameSettings', GameSettingsSchema); 