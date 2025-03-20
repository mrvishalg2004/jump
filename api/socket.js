const { server } = require('../backend/server');

module.exports = (req, res) => {
  // Log socket request for debugging
  console.log('Socket.IO serverless function called with:', {
    url: req.url,
    method: req.method,
    headers: req.headers
  });
  
  // Let the HTTP server (with socket.io attached) handle the request
  return server(req, res);
}; 