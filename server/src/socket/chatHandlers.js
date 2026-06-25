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

const handleChatEvents = (io, socket) => {
  // Listen for incoming chat messages from a user (protected)
  socket.on('send_message', async ({ roomId, username, message }) => {
    if (!roomId) return;

    // Check authorization
    const role = await getRole(roomId, socket.user?.userId);
    if (!['OWNER', 'EDITOR'].includes(role)) {
      return console.warn(`[Socket] Blocked unauthorized chat message from socket ${socket.id}`);
    }

    // Construct the message object with a timestamp
    const messageData = {
      username: socket.user?.name || username || 'Guest',
      message,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast the message to everyone in the room (including the sender!)
    io.to(roomId).emit('receive_message', messageData);
  });
};

module.exports = handleChatEvents;
