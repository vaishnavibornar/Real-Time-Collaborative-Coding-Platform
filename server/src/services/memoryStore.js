// Centralized In-Memory Store for fallback mode
const users = new Map();         // email -> User
const rooms = new Map();         // roomId -> Room
const files = new Map();         // fileId -> File
const roomMembers = [];          // Array of { roomId, userId, role }
const invitations = new Map();   // invitationId -> Invitation
const joinRequests = [];         // Array of { roomId, userId, name, email, status }

module.exports = {
  users,
  rooms,
  files,
  roomMembers,
  invitations,
  joinRequests
};
