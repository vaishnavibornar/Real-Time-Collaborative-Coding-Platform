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

const handleCodeEvents = (socket) => {
  // Listen for real-time code changes from a client (protected)
  socket.on('code_change', async ({ roomId, fileId, code }) => {
    if (!fileId || !roomId) return;

    // Check authorization
    const role = await getRole(roomId, socket.user?.userId);
    if (!['OWNER', 'EDITOR'].includes(role)) {
      return console.warn(`[Socket] Blocked unauthorized code_change from socket ${socket.id}`);
    }

    // Broadcast the updated code to everyone else in the same room
    socket.to(roomId).emit('code_update', { fileId, code });

    // Queue the code content to be debounced and auto-saved to DB
    fileService.queueFileSave(fileId, code);
  });
};

module.exports = handleCodeEvents;
