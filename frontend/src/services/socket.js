import { io } from 'socket.io-client';
import { socketUrl } from '../config/env';

const socket = io(socketUrl, {
  autoConnect: false,
});

export function connectSocket(token = localStorage.getItem('token')) {
  if (!token) return;

  socket.auth = { token };
  if (!socket.connected) socket.connect();
}

export function disconnectSocket() {
  socket.disconnect();
  socket.auth = {};
}

export default socket;
