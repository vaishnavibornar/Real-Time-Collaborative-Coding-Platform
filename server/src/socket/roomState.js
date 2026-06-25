const roomStates = {};
const onlineUsers = new Map(); // socket.id -> { userId, name, email }

module.exports = {
  roomStates,
  onlineUsers
};
