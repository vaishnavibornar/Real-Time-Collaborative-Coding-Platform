const handleWebrtcEvents = (socket) => {
  // Basic WebRTC signaling handlers for peer-to-peer audio/video connection
  
  socket.on('webrtc_offer', ({ roomId, offer }) => {
    socket.to(roomId).emit('webrtc_offer', {
      socketId: socket.id,
      offer
    });
  });

  socket.on('webrtc_answer', ({ roomId, answer }) => {
    socket.to(roomId).emit('webrtc_answer', {
      socketId: socket.id,
      answer
    });
  });

  socket.on('webrtc_ice_candidate', ({ roomId, candidate }) => {
    socket.to(roomId).emit('webrtc_ice_candidate', {
      socketId: socket.id,
      candidate
    });
  });
};

module.exports = handleWebrtcEvents;
