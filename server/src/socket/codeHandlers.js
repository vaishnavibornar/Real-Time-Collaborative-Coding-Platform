const fileService = require('../services/fileService');

const handleCodeEvents = (socket) => {
  // Listen for real-time code changes from a client
  socket.on('code_change', ({ roomId, fileId, code }) => {
    if (!fileId) return;

    // Broadcast the updated code to everyone else in the same room
    socket.to(roomId).emit('code_update', { fileId, code });

    // Queue the code content to be debounced and auto-saved to DB
    fileService.queueFileSave(fileId, code);
  });
};

module.exports = handleCodeEvents;
