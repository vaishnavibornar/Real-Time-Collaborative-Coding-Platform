require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const initSocket = require('./socket/index');
const roomRoutes = require('./routes/rooms');
const fileRoutes = require('./routes/files');

// Connect to Database
connectDB();

// Setup Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));
app.use(express.json());

// Integrate Socket.IO and enable CORS for frontend
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Initialize socket handlers
initSocket(io);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});