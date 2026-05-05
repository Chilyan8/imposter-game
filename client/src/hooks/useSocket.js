import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io('http://localhost:3001', { autoConnect: false });
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
