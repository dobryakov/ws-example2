/**
 * Socket.IO connection handling with GUID-based authentication
 * Room per user for message delivery
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { queueManager, Message } from './queues.js';

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate GUID format
 */
export function isValidGUID(guid: string): boolean {
  return GUID_REGEX.test(guid);
}

/**
 * Extract GUID from cookie or query parameter
 */
function getGUIDFromRequest(socket: Socket): string | null {
  // Try cookie first
  const cookieHeader = socket.handshake.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    const guidCookie = cookies.find(c => c.startsWith('userGUID='));
    if (guidCookie) {
      const guid = guidCookie.split('=')[1];
      if (isValidGUID(guid)) {
        return guid;
      }
    }
  }
  
  // Try query parameter (for service worker)
  const queryGUID = socket.handshake.query.userGUID;
  if (queryGUID && typeof queryGUID === 'string' && isValidGUID(queryGUID)) {
    return queryGUID;
  }
  
  return null;
}

/**
 * Setup socket.io connection handling
 */
export function setupSockets(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    // Extract GUID from cookie or query parameter
    const userGUID = getGUIDFromRequest(socket);

    if (!userGUID) {
      console.log(`[Socket] Connection rejected: no valid GUID in cookie or query`);
      socket.disconnect();
      return;
    }

    console.log(`[Socket] User connected: ${userGUID}, socket ID: ${socket.id}`);

    // Join user-specific room
    socket.join(userGUID);

    // Get user's queue and deliver pending messages
    const queue = queueManager.getQueue(userGUID);
    const pendingMessages = queue.dequeueAll();

    if (pendingMessages.length > 0) {
      console.log(`[Socket] Delivering ${pendingMessages.length} pending messages to user: ${userGUID}`);
      socket.emit('messages', pendingMessages);
    }

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User disconnected: ${userGUID}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket] Error for user ${userGUID}:`, error);
    });
  });
}

/**
 * Send message to user (if online) or queue it
 */
export function deliverMessage(userId: string, message: Message): void {
  const queue = queueManager.getQueue(userId);
  
  // Check if user is online (has active socket connection)
  const io = (global as any).io as SocketIOServer | undefined;
  if (!io) {
    console.error('[Socket] IO server not available');
    queue.enqueue(message);
    return;
  }

  const userRoom = io.sockets.adapter.rooms.get(userId);
  const isOnline = userRoom && userRoom.size > 0;

  if (isOnline) {
    // User is online - deliver immediately
    console.log(`[Socket] Delivering message ${message.id} to online user: ${userId}`);
    io.to(userId).emit('message', message);
  } else {
    // User is offline - queue message
    console.log(`[Socket] User ${userId} is offline, queuing message ${message.id}`);
    queue.enqueue(message);
  }
}

