require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const initSocket = require('./socket/index');
const logger = require('./utils/logger');
const roomRoutes = require('./routes/rooms');
const fileRoutes = require('./routes/files');
const authRoutes = require('./routes/auth');
const invitationRoutes = require('./routes/invitations');

// Connect to Database
connectDB();

// Setup Express app and HTTP server
const app = express();
const server = http.createServer(app);

// CORS configuration
const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: clientOrigin,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));
app.use(express.json());

// Morgan HTTP request logging integrated with Winston
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: logger.stream }));

// Integrate Socket.IO and enable CORS for frontend
const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

app.set('io', io);

// API Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/invitations', invitationRoutes);

// Basic route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Initialize socket handlers
initSocket(io);

// Start the server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});