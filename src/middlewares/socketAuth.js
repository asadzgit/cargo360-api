/**
 * Socket.IO Authentication Middleware
 * Validates JWT token from socket connection
 */

const jwt = require('jsonwebtoken');
const { jwt: jwtCfg } = require('../../config/env');

/**
 * Socket authentication middleware
 * Extracts and validates JWT token from handshake
 */
function socketAuth(socket, next) {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth?.token || 
                  socket.handshake.query?.token ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      console.warn('[SOCKET-AUTH] No token provided');
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const payload = jwt.verify(token, jwtCfg.accessSecret);
    
    // Attach user info to socket
    socket.userId = payload.id;
    socket.userRole = payload.role;
    
    console.log('[SOCKET-AUTH] User authenticated:', { userId: payload.id, role: payload.role });
    next();
  } catch (error) {
    console.error('[SOCKET-AUTH] Authentication failed:', error.message);
    next(new Error('Authentication failed'));
  }
}

module.exports = socketAuth;

