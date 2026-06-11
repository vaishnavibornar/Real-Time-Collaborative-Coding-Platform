const handleChatEvents = (io, socket) => {
  // Listen for incoming chat messages from a user
  socket.on('send_message', ({ roomId, username, message }) => {
    // Construct the message object with a timestamp
    const messageData = {
      username,
      message,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast the message to everyone in the room (including the sender!)
    io.to(roomId).emit('receive_message', messageData);
  });
};

module.exports = handleChatEvents;
