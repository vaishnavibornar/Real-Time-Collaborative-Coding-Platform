const fileService = require('../services/fileService');
const RoomMember = require('../models/RoomMember');
const { roomMembers } = require('../services/memoryStore');

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

/**
 * Handle language synchronization events (protected).
 */
const handleLanguageEvents = (io, socket) => {
  socket.on('language_change', async ({ roomId, fileId, language }) => {
    if (!fileId || !roomId) return;

    try {
      // Check authorization
      const role = await getRole(roomId, socket.user?.userId);
      if (!['OWNER', 'EDITOR'].includes(role)) {
        return console.warn(`[Socket] Blocked unauthorized language_change from socket ${socket.id}`);
      }

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
