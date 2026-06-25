const jwt = require('jsonwebtoken');
const handleRoomEvents = require('./roomHandlers');
const handleCodeEvents = require('./codeHandlers');
const handleChatEvents = require('./chatHandlers');
const handleWebrtcEvents = require('./webrtcHandlers');
const handleLanguageEvents = require('./languageHandlers');
const fileService = require('../services/fileService');
const { onlineUsers } = require('./roomState');
const RoomMember = require('../models/RoomMember');
const { roomMembers } = require('../services/memoryStore');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-it-in-production';

const getRole = async (roomId, userId) => {
  if (!userId) return null;
  if (global.useInMemoryDb) {
    const member = roomMembers.find(m => m.roomId === roomId && m.userId === userId);
    return member ? member.role : null;
  } else {
    const member = await RoomMember.findOne({ roomId, userId });
    return member ? member.role : null;
  }
};

const initSocket = (io) => {
  // 1. Connection authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded; // { userId, name, email }
      } catch (err) {
        logger.warn(`[Socket] Auth failed for socket ${socket.id}: ${err.message}`);
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.id} (Authenticated: ${!!socket.user})`);

    if (socket.user) {
      // Join user to their own personal room to allow direct targeting of notifications
      socket.join(socket.user.userId);
      onlineUsers.set(socket.id, {
        userId: socket.user.userId,
        name: socket.user.name,
        email: socket.user.email,
        roomId: null
      });
    }

    // Connect individual feature handlers
    handleRoomEvents(io, socket);
    handleCodeEvents(socket);
    handleChatEvents(io, socket);
    handleWebrtcEvents(socket);
    handleLanguageEvents(io, socket);

    // Sync file creation (protected)
    socket.on('file_create', async ({ roomId, file }) => {
      const role = await getRole(roomId, socket.user?.userId);
      if (['OWNER', 'EDITOR'].includes(role)) {
        socket.to(roomId).emit('file_created', { file });
      } else {
        logger.warn(`[Socket] Blocked unauthorized file_create from ${socket.id}`);
      }
    });

    // Sync file deletion (protected)
    socket.on('file_delete', async ({ roomId, fileId, newActiveFileId }) => {
      const role = await getRole(roomId, socket.user?.userId);
      if (['OWNER', 'EDITOR'].includes(role)) {
        socket.to(roomId).emit('file_deleted', { fileId, newActiveFileId });
      } else {
        logger.warn(`[Socket] Blocked unauthorized file_delete from ${socket.id}`);
      }
    });

    // Sync file renaming (protected)
    socket.on('file_rename', async ({ roomId, fileId, fileName, language }) => {
      const role = await getRole(roomId, socket.user?.userId);
      if (['OWNER', 'EDITOR'].includes(role)) {
        socket.to(roomId).emit('file_renamed', { fileId, fileName, language });
      } else {
        logger.warn(`[Socket] Blocked unauthorized file_rename from ${socket.id}`);
      }
    });

    // Sync file active selection (allowed for all members/viewers)
    socket.on('file_select', async ({ roomId, fileId }) => {
      const role = await getRole(roomId, socket.user?.userId);
      if (role && role !== 'PENDING') {
        socket.to(roomId).emit('file_selected', { fileId });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${socket.id}`);
      
      const userEntry = onlineUsers.get(socket.id);
      onlineUsers.delete(socket.id);

      if (socket.roomId) {
        // Trigger a participant status update broadcast
        const { emitParticipantsUpdate } = require('./socketUtils');
        await emitParticipantsUpdate(io, socket.roomId);

        try {
          await fileService.flushRoomSaves(socket.roomId);
        } catch (err) {
          logger.error(`Error flushing saves on disconnect for room ${socket.roomId}: ${err.message}`, { error: err });
        }
      }
    });
  });
};

module.exports = initSocket;
