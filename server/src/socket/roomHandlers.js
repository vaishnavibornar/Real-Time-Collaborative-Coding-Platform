const fileService = require('../services/fileService');

const handleRoomEvents = (io, socket) => {
  // Listen for user joining a room
  socket.on('join_room', async ({ roomId, username }) => {
    socket.join(roomId);
    socket.roomId = roomId; // Store room ID on socket session
    console.log(`${username} (${socket.id}) joined room: ${roomId}`);

    try {
      // Get or create the room in DB (which guarantees at least one default file)
      const room = await fileService.getOrCreateRoom(roomId);
      
      // Send the current room language to the joining client so they are synchronized
      socket.emit('language_update', { language: room.selectedLanguage });

      // Broadcast to everyone else in the room that a new user has joined
      socket.to(roomId).emit('user_joined', {
        socketId: socket.id,
        username,
        message: `${username} has joined the room.`
      });
    } catch (err) {
      console.error(`Error in join_room socket handler for room ${roomId}:`, err);
    }
  });

  // Listen for user leaving a room
  socket.on('leave_room', async ({ roomId, username }) => {
    socket.leave(roomId);
    console.log(`${username} (${socket.id}) left room: ${roomId}`);

    // Flush any pending saves for this room since a user is leaving
    try {
      await fileService.flushRoomSaves(roomId);
    } catch (err) {
      console.error(`Error flushing saves on leave_room for room ${roomId}:`, err);
    }

    // Broadcast to everyone else in the room that a user has left
    socket.to(roomId).emit('user_left', {
      socketId: socket.id,
      username,
      message: `${username} has left the room.`
    });
  });
};

module.exports = handleRoomEvents;
