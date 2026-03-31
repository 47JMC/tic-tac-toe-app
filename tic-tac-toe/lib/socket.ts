import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function initSocket(): Socket {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!API_BASE_URL) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
  }

  if (socket) return socket;

  // if not initialized, create a new socket connection

  socket = io(API_BASE_URL, {
    withCredentials: true,
    autoConnect: false, // don't connect immediately
  });

  return socket;
}
