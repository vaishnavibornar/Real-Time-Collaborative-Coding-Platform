const fileService = require('../services/fileService');
const Room = require('../models/Room');
const RoomMember = require('../models/RoomMember');
const { rooms, roomMembers, users } = require('../services/memoryStore');
const { onlineUsers } = require('./roomState');
const { emitParticipantsUpdate } = require('./socketUtils');

const handleRoomEvents = (io, socket) => {
  // 1. Listen for user joining a room
  socket.on('join_room', async ({ roomId, username }) => {
    try {
      let room = null;
      let memberRole = null;
      const userId = socket.user?.userId;

      // Fetch Room
      if (global.useInMemoryDb) {
        room = rooms.get(roomId);
      } else {
        room = await Room.findOne({ roomId }).lean();
      }

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found' });
      }

      // Check Membership
      if (userId) {
        if (global.useInMemoryDb) {
          const member = roomMembers.find(m => m.roomId === roomId && m.userId === userId);
          memberRole = member ? member.role : null;
        } else {
          const member = await RoomMember.findOne({ roomId, userId }).lean();
          memberRole = member ? member.role : null;
        }
      }

      // Access Control Verification
      if (room.visibility === 'private') {
        if (!memberRole || memberRole === 'PENDING') {
          return socket.emit('access_denied', { 
            roomId, 
            roomName: room.roomName, 
            status: memberRole || 'none' 
          });
        }
      } else {
        // Public room: default role is EDITOR if authenticated, VIEWER if guest
        if (!memberRole) {
          memberRole = userId ? 'EDITOR' : 'VIEWER';
          // Save membership for logged-in users
          if (userId) {
            if (global.useInMemoryDb) {
              roomMembers.push({
                roomId,
                userId,
                role: 'EDITOR',
                createdAt: new Date()
              });
            } else {
              const newMember = new RoomMember({ roomId, userId, role: 'EDITOR' });
              await newMember.save();
            }
          }
        }
      }

      // Proceed to Join
      socket.join(roomId);
      socket.roomId = roomId; // Store room ID on socket session

      // Update online registry
      if (socket.user) {
        const entry = onlineUsers.get(socket.id);
        if (entry) {
          entry.roomId = roomId;
        }
      }

      console.log(`[Socket] ${username || 'Guest'} (${socket.id}) joined room: ${roomId} with role: ${memberRole || 'VIEWER'}`);

      // Send the current room language to the joining client so they are synchronized
      socket.emit('language_update', { language: room.selectedLanguage });
      
      // Send their verified role
      socket.emit('role_assignment', { role: memberRole || 'VIEWER' });

      // Broadcast to everyone else in the room that a new user has joined
      socket.to(roomId).emit('user_joined', {
        socketId: socket.id,
        username: username || 'Guest',
        message: `${username || 'Guest'} has joined the room.`
      });

      // Broadcast updated participants list
      await emitParticipantsUpdate(io, roomId);
    } catch (err) {
      console.error(`Error in join_room socket handler for room ${roomId}:`, err);
      socket.emit('error_message', { message: 'Failed to join room' });
    }
  });

  // 2. Listen for Join Requests (for private rooms)
  socket.on('join_request', async ({ roomId }) => {
    try {
      if (!socket.user) {
        return socket.emit('error_message', { message: 'Must be logged in to request access' });
      }

      const userId = socket.user.userId;
      const username = socket.user.name;
      const userEmail = socket.user.email;

      let room = null;
      if (global.useInMemoryDb) {
        room = rooms.get(roomId);
      } else {
        room = await Room.findOne({ roomId }).lean();
      }

      if (!room) {
        return socket.emit('error_message', { message: 'Room not found' });
      }

      if (room.visibility !== 'private') {
        return socket.emit('error_message', { message: 'Room is not private' });
      }

      // Upsert pending membership
      let existingMember = null;
      if (global.useInMemoryDb) {
        existingMember = roomMembers.find(m => m.roomId === roomId && m.userId === userId);
        if (!existingMember) {
          existingMember = { roomId, userId, role: 'PENDING', createdAt: new Date() };
          roomMembers.push(existingMember);
        }
      } else {
        existingMember = await RoomMember.findOne({ roomId, userId });
        if (!existingMember) {
          existingMember = new RoomMember({ roomId, userId, role: 'PENDING' });
          await existingMember.save();
        }
      }

      if (existingMember && existingMember.role !== 'PENDING') {
        return socket.emit('error_message', { message: 'Already a member of this room' });
      }

      // Notify owner in real-time if they are online
      const ownerId = room.ownerId.toString();
      io.to(ownerId).emit('join_request_received', {
        roomId,
        roomName: room.roomName,
        requester: {
          userId,
          name: username,
          email: userEmail
        }
      });

      // Also trigger participant update so the owner's sidebar shows the request if they are inside the room
      await emitParticipantsUpdate(io, roomId);

      // Confirm to the requester
      socket.emit('join_request_sent', { roomId, status: 'PENDING' });
    } catch (err) {
      console.error('Error handling join_request socket event:', err);
      socket.emit('error_message', { message: 'Failed to submit join request' });
    }
  });

  // 3. Listen for user leaving a room
  socket.on('leave_room', async ({ roomId, username }) => {
    try {
      socket.leave(roomId);
      socket.roomId = null;

      // Update online registry
      const entry = onlineUsers.get(socket.id);
      if (entry) {
        entry.roomId = null;
      }

      console.log(`[Socket] ${username || 'Guest'} (${socket.id}) left room: ${roomId}`);

      // Flush any pending saves for this room since a user is leaving
      try {
        await fileService.flushRoomSaves(roomId);
      } catch (err) {
        console.error(`Error flushing saves on leave_room for room ${roomId}:`, err);
      }

      // Broadcast to everyone else in the room that a user has left
      socket.to(roomId).emit('user_left', {
        socketId: socket.id,
        username: username || 'Guest',
        message: `${username || 'Guest'} has left the room.`
      });

      // Broadcast updated participants list
      await emitParticipantsUpdate(io, roomId);
    } catch (err) {
      console.error(`Error in leave_room socket handler for room ${roomId}:`, err);
    }
  });
};

module.exports = handleRoomEvents;
