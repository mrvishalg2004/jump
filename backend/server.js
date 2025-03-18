const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const portfinder = require('portfinder');
const fs = require('fs');
require('dotenv').config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/treasure-hunt';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Export io for use in routes
module.exports = { io };

// Routes
const playerRoutes = require('./routes/playerRoutes');
app.use('/api/players', playerRoutes);

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
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Root route
app.get('/', (req, res) => {
  res.send('Treasure Hunt API is running');
});

// Start server with dynamic port assignment
const startServer = async () => {
  try {
    // Configure portfinder to start looking from port 5000
    portfinder.basePort = 5000;
    
    // Find an available port
    const PORT = await portfinder.getPortPromise();
    
    // Start the server on the available port
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}`);
      
      // Create a file to store the current port for the frontend to use
      fs.writeFileSync('./current-port.txt', PORT.toString());
      console.log(`Port ${PORT} saved to current-port.txt`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();

// Export app for testing
module.exports.app = app; 