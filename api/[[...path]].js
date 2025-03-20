const { app } = require('../backend/server');

module.exports = (req, res) => {
  // Log the request for debugging
  console.log('Serverless function called with:', {
    url: req.url,
    method: req.method,
    path: req.query.path || 'root',
    headers: req.headers
  });
  
  // Let the Express app handle the request
  return app(req, res);
}; 