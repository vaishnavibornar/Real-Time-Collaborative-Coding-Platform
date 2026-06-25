const { onlineUsers } = require('./roomState');
const RoomMember = require('../models/RoomMember');
const { roomMembers, users } = require('../services/memoryStore');

const emitParticipantsUpdate = async (io, roomId) => {
  try {
    let membersList = [];

    // 1. Fetch all members and pending requests for this room
    if (global.useInMemoryDb) {
      const dbMembers = roomMembers.filter(m => m.roomId === roomId);
      membersList = dbMembers.map(m => {
        const userObj = Array.from(users.values()).find(u => u.id === m.userId);
        return {
          userId: m.userId,
          name: userObj ? userObj.name : 'Unknown User',
          email: userObj ? userObj.email : '',
          role: m.role
        };
      });
    } else {
      const dbMembers = await RoomMember.find({ roomId }).populate('userId', 'name email').lean();
      membersList = dbMembers.map(m => ({
        userId: m.userId?._id?.toString() || m.userId,
        name: m.userId?.name || 'Unknown User',
        email: m.userId?.email || '',
        role: m.role
      }));
    }

    // 2. Determine which users are currently online in the room
    const activeSockets = io.sockets.adapter.rooms.get(roomId);
    const onlineUserIds = new Set();

    if (activeSockets) {
      for (const socketId of activeSockets) {
        const u = onlineUsers.get(socketId);
        if (u) {
          onlineUserIds.add(u.userId);
        }
      }
    }

    const updatedMembers = membersList.map(m => ({
      ...m,
      online: onlineUserIds.has(m.userId)
    }));

    // 3. Separate members and pending join requests
    const approvedMembers = updatedMembers.filter(m => m.role !== 'PENDING');
    const pendingRequests = updatedMembers.filter(m => m.role === 'PENDING');

    // Broadcast to everyone in the room
    io.to(roomId).emit('participants_update', {
      members: approvedMembers,
      pendingRequests
    });
  } catch (err) {
    console.error(`Error emitting participants update for room ${roomId}:`, err);
  }
};

module.exports = {
  emitParticipantsUpdate
};
