// Use the Express app from the backend server
const { app } = require('../backend/server');

// Export the Express app for Vercel serverless function
module.exports = app; 