const fileService = require('../services/fileService');

/**
 * Handle language synchronization events.
 *
 * @param {object} io - Socket.io server instance
 * @param {object} socket - Connected socket instance
 */
const handleLanguageEvents = (io, socket) => {
  // Listen for real-time language change events from a client
  socket.on('language_change', async ({ roomId, fileId, language }) => {
    if (!fileId) return;

    try {
      // 1. Maintain shared state: Update language in DB
      await fileService.updateFile(fileId, { language });

      console.log(`[Socket] File ${fileId} language changed to: ${language} by ${socket.id}`);

      // 2. Broadcast the change to everyone else in the same room
      socket.to(roomId).emit('language_update', { fileId, language });
    } catch (err) {
      console.error(`Error updating file language in socket:`, err);
    }
  });
};

module.exports = handleLanguageEvents;
