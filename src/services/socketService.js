/**
 * Socket.IO Service
 * Manages socket connections and provides methods to emit notifications
 */

let io = null;
const userSockets = new Map(); // userId -> Set of socketIds

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 */
function initializeSocket(server) {
  const { Server } = require('socket.io');
  
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  console.log('[SOCKET] Socket.IO server initialized');

  return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
}

/**
 * Register socket connection for a user
 * @param {string} socketId - Socket ID
 * @param {number} userId - User ID
 */
function registerUserSocket(socketId, userId) {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socketId);
  console.log('[SOCKET] User connected:', { userId, socketId, totalConnections: userSockets.get(userId).size });
}

/**
 * Unregister socket connection for a user
 * @param {string} socketId - Socket ID
 * @param {number} userId - User ID
 */
function unregisterUserSocket(socketId, userId) {
  if (userSockets.has(userId)) {
    userSockets.get(userId).delete(socketId);
    if (userSockets.get(userId).size === 0) {
      userSockets.delete(userId);
    }
    console.log('[SOCKET] User disconnected:', { userId, socketId });
  }
}

/**
 * Get all socket IDs for a user
 * @param {number} userId - User ID
 * @returns {Set<string>} Set of socket IDs
 */
function getUserSockets(userId) {
  return userSockets.get(userId) || new Set();
}

/**
 * Check if user is connected
 * @param {number} userId - User ID
 * @returns {boolean}
 */
function isUserConnected(userId) {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
}

/**
 * Send notification to a specific user
 * @param {number} userId - User ID
 * @param {string} event - Event name (default: 'notification')
 * @param {Object} data - Notification data
 */
function emitToUser(userId, event = 'notification', data) {
  if (!io) {
    console.warn('[SOCKET] Socket.IO not initialized, skipping socket notification');
    return false;
  }

  const sockets = getUserSockets(userId);
  
  if (sockets.size === 0) {
    console.log('[SOCKET] User not connected:', userId);
    return false;
  }

  let sent = 0;
  sockets.forEach(socketId => {
    try {
      io.to(socketId).emit(event, data);
      sent++;
    } catch (error) {
      console.error('[SOCKET] Error emitting to socket:', { socketId, error: error.message });
    }
  });

  console.log('[SOCKET] Notification sent:', { userId, event, sockets: sent, total: sockets.size });
  return sent > 0;
}

/**
 * Broadcast to all connected users
 * @param {string} event - Event name
 * @param {Object} data - Data to broadcast
 */
function broadcast(event, data) {
  if (!io) {
    console.warn('[SOCKET] Socket.IO not initialized, skipping broadcast');
    return;
  }
  io.emit(event, data);
}

module.exports = {
  initializeSocket,
  getIO,
  registerUserSocket,
  unregisterUserSocket,
  getUserSockets,
  isUserConnected,
  emitToUser,
  broadcast
};

