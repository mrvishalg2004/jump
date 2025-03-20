const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const portfinder = require('portfinder');
require('dotenv').config();

// Add at the beginning of the file, after the imports but before the middleware setup
console.log('======================================');
console.log('Starting server...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);

// Handle Vercel serverless functions
const isVercel = process.env.VERCEL || false;
console.log('Is running on Vercel:', isVercel);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Setup CORS options based on environment
const corsOptions = {
  origin: process.env.VERCEL_ENV ? '*' : 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Configure Socket.io with CORS
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow all origins in production
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  path: '/socket.io',
  allowEIO3: true, // Allow Engine.IO v3 compatibility for older clients
  pingTimeout: 60000, // Increase ping timeout
  pingInterval: 25000, // Increase ping interval
  connectTimeout: 45000, // Increase connection timeout
  maxHttpBufferSize: 1e8 // Increase buffer size for large payloads
});

// Make io available globally
global.io = io;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the current-port.txt file from the root
app.get('/current-port.txt', (req, res) => {
  try {
    // For Vercel, use 443 for HTTPS as the port
    if (process.env.VERCEL_ENV) {
      res.set('Content-Type', 'text/plain');
      res.send('443');
      return;
    }
    
    // Check if file exists first (local development)
    if (fs.existsSync('./current-port.txt')) {
      const port = fs.readFileSync('./current-port.txt', 'utf8');
      res.set('Content-Type', 'text/plain');
      res.send(port);
    } else {
      res.status(404).send('Port file not found yet');
    }
  } catch (err) {
    console.error('Error serving port file:', err);
    res.status(404).send('Error accessing port file');
  }
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt';
console.log('Connecting to MongoDB...');

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  retryWrites: true
})
.then(() => console.log('MongoDB Connected Successfully'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  // Don't exit process on connection error in production
  if (!process.env.VERCEL_ENV) {
    process.exit(1);
  }
});

// Handle connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected, attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
});

// Routes
const playerRoutes = require('./routes/playerRoutes');
app.use('/api/players', playerRoutes);

const linkValidationRoutes = require('./routes/linkValidation');
app.use('/api', linkValidationRoutes);

// Verify Round 2 link
app.post('/api/verify-round2-link', (req, res) => {
  const { link } = req.body;
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

  if (correctLinks.includes(link)) {
    // Update player progress logic here
    return res.status(200).json({ message: 'Round 1 completed successfully!' });
  } else {
    return res.status(400).json({ message: 'Invalid link!' });
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join admin room
  socket.on('joinAdminRoom', () => {
    socket.join('adminRoom');
    console.log('Admin joined');
  });
  
  // Emit player updates to admin
  socket.on('playerUpdate', (data) => {
    io.to('adminRoom').emit('playerUpdate', data);
  });
  
  // Handle player disqualification
  socket.on('playerDisqualified', (data) => {
    console.log('Broadcasting player disqualification:', data);
    
    // Log additional details for debugging
    console.log('Disqualification details:', {
      playerId: data.playerId,
      username: data.username,
      timestamp: data.timestamp || 'none'
    });
    
    // Broadcast to ALL connected clients to ensure the target player receives it
    io.emit('playerDisqualified', {
      ...data,
      timestamp: data.timestamp || Date.now(),
      broadcast: true // Flag to indicate this is a broadcast
    });
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Special route for Vercel deployment health check
app.get('/', (req, res) => {
  res.status(200).send('Treasure Hunt API is running!');
});

// Add health check endpoint for socket.io
app.get('/socket-check', (req, res) => {
  res.status(200).json({ 
    socketAvailable: true,
    message: 'Socket.IO server is running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all route for debugging missing endpoints
app.use('*', (req, res) => {
  console.log(`404 for route: ${req.method} ${req.originalUrl}`);
  res.status(404).send(`Endpoint not found: ${req.method} ${req.originalUrl}. Available endpoints are under /api/players/`);
});

// Start server with dynamic port assignment
const startServer = async () => {
  try {
    // For Vercel environment, use their port or 3000 as fallback
    if (process.env.VERCEL_ENV) {
      const PORT = process.env.PORT || 3000;
      console.log('Vercel deployment detected, using port:', PORT);
      console.log('======================================');
      
      // Start the server
      server.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Vercel deployment active`);
      });
      return;
    }
    
    // For local development, use portfinder for dynamic port assignment
    // Configure portfinder to start looking from port 5000
    portfinder.basePort = 5000;
    
    // Find an available port
    const PORT = await portfinder.getPortPromise();
    
    // Now log the PORT after it's defined
    console.log('Server port:', PORT);
    console.log('======================================');
    
    // Start the server on the available port
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
      
      // Create a file to store the current port for the frontend to use
      fs.writeFileSync('./current-port.txt', PORT.toString());
      console.log(`Port ${PORT} saved to current-port.txt`);
      
      // Make the file accessible to the public
      if (!fs.existsSync('./public')) {
        fs.mkdirSync('./public');
      }
      fs.writeFileSync('./public/current-port.txt', PORT.toString());
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();

// Export app for testing
module.exports.app = app; 