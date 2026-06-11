import { io } from 'socket.io-client';

// Connect to the backend server running on port 4000
const socket = io('http://localhost:4000', {
  autoConnect: true,
});

export default socket;
