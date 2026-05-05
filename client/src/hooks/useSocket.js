import { useEffect } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(SERVER_URL, { autoConnect: false });
  }
  return socketInstance;
}

export function useSocket() {
  const socket = getSocket();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    return () => {};
  }, [socket]);

  return socket;
}
