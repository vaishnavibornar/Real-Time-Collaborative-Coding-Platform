const handleRoomEvents = require('./roomHandlers');
const handleCodeEvents = require('./codeHandlers');
const handleChatEvents = require('./chatHandlers');
const handleWebrtcEvents = require('./webrtcHandlers');
const handleLanguageEvents = require('./languageHandlers');
const fileService = require('../services/fileService');

const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Connect individual feature handlers
    handleRoomEvents(io, socket);
    handleCodeEvents(socket);
    handleChatEvents(io, socket);
    handleWebrtcEvents(socket);
    handleLanguageEvents(io, socket);

    // Sync file creation
    socket.on('file_create', ({ roomId, file }) => {
      socket.to(roomId).emit('file_created', { file });
    });

    // Sync file deletion
    socket.on('file_delete', ({ roomId, fileId, newActiveFileId }) => {
      socket.to(roomId).emit('file_deleted', { fileId, newActiveFileId });
    });

    // Sync file renaming
    socket.on('file_rename', ({ roomId, fileId, fileName, language }) => {
      socket.to(roomId).emit('file_renamed', { fileId, fileName, language });
    });

    // Sync file active selection
    socket.on('file_select', ({ roomId, fileId }) => {
      socket.to(roomId).emit('file_selected', { fileId });
    });

    // Handle user disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.id}`);
      if (socket.roomId) {
        try {
          await fileService.flushRoomSaves(socket.roomId);
        } catch (err) {
          console.error(`Error flushing saves on disconnect for room ${socket.roomId}:`, err);
        }
      }
    });
  });
};

module.exports = initSocket;
