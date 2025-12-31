/**
 * Socket.IO Connection Handler
 * Handles socket connections, disconnections, and events
 */

const socketAuth = require('../middlewares/socketAuth');
const { registerUserSocket, unregisterUserSocket, getIO } = require('../services/socketService');

/**
 * Setup socket connection handlers
 */
function setupSocketHandlers() {
  const io = getIO();

  // Authentication middleware
  io.use(socketAuth);

  // Handle new connections
  io.on('connection', (socket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    console.log('[SOCKET] Client connected:', { userId, userRole, socketId: socket.id });

    // Register user socket
    registerUserSocket(socket.id, userId);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to real-time notifications',
      userId,
      timestamp: new Date().toISOString()
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Client disconnected:', { userId, socketId: socket.id, reason });
      unregisterUserSocket(socket.id, userId);
    });

    // Handle ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle custom events if needed
    socket.on('error', (error) => {
      console.error('[SOCKET] Socket error:', { userId, socketId: socket.id, error });
    });
  });

  console.log('[SOCKET] Socket handlers setup complete');
}

module.exports = { setupSocketHandlers };

