import { io } from "socket.io-client";

import { SOCKET_URL } from "../config/env";
import { getAuthToken } from "../utils/authSession";

let socketInstance = null;

/**
 * Shared Singleton Socket.IO Client
 * Ensures unified lifecycle management, token authorization handshake,
 * and resilient auto-reconnection across all frontend components.
 */
export const getSocket = (forceNew = false) => {
  if (forceNew && socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  if (!socketInstance) {
    const token = getAuthToken();

    socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log(`[Socket Client] Connected with ID: ${socketInstance.id}`);
    });

    socketInstance.on("connect_error", (err) => {
      console.warn(`[Socket Client] Connection error: ${err.message}`);
    });
  }

  return socketInstance;
};

/**
 * Cleanly disconnects the singleton socket instance
 */
export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

export default getSocket;
