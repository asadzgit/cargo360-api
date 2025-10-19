const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
// const morgan = require('morgan'); // Replaced by custom request/response logger below
const rateLimit = require('express-rate-limit');

const { port, corsOrigin } = require('../config/env');
const authRoutes = require('./routes/auth.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const shipmentsRoutes = require('./routes/shipments.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const adminRoutes = require('./routes/admin.routes');
const locationRoutes = require('./routes/location.routes');
const discountRequestsRoutes = require('./routes/discountRequests.routes');
const usersRoutes = require('./routes/users.routes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173/','https://cargo360pk.com'], credentials: true }));
app.use(express.json({ limit: '1mb' }));
// --- Detailed request/response logger with redaction ---
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'emailVerificationToken',
  'passwordResetToken',
  'authorization',
  'Authorization'
]);
function sanitize(value, depth = 0) {
  const MAX_DEPTH = 4;
  const MAX_ARRAY_ITEMS = 50;
  if (value == null) return value;
  if (depth > MAX_DEPTH) return '[Truncated]';
  if (typeof value === 'string') return value.length > 1000 ? value.slice(0, 1000) + '…' : value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    const limited = value.slice(0, MAX_ARRAY_ITEMS).map(v => sanitize(v, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) limited.push('…');
    return limited;
  }

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  return out;
}
app.use((req, res, next) => {
  const start = process.hrtime.bigint();

  // Capture response body by monkey-patching res.json and res.send
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  res.locals.responseBody = undefined;

  res.json = (body) => {
    res.locals.responseBody = body;
    return originalJson(body);
  };
  res.send = (body) => {
    // Avoid double-stringifying buffers
    try { res.locals.responseBody = body; } catch (_) {}
    return originalSend(body);
  };
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;

    // Build a compact, sanitized log line
    const payload = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      ip: req.ip,
      user: req.user ? { id: req.user.id, role: req.user.role } : undefined,
      params: sanitize(req.params),
      query: sanitize(req.query),
      body: sanitize(req.body),
    };

    // Serialize and truncate response body for safety
    let responsePreview;
    try {
      if (typeof res.locals.responseBody === 'object') {
        responsePreview = JSON.stringify(sanitize(res.locals.responseBody));
      } else if (typeof res.locals.responseBody === 'string') {
        responsePreview = res.locals.responseBody;
      } else if (res.locals.responseBody !== undefined) {
        responsePreview = String(res.locals.responseBody);
      }
    } catch (_) {
      responsePreview = '[Unserializable Response]';
    }
    if (responsePreview && responsePreview.length > 5000) {
      responsePreview = responsePreview.slice(0, 5000) + '…';
    }

    // Final log output
    const logObj = { ...payload, response: responsePreview };
    if (res.statusCode >= 500) {
      console.error('[HTTP]', logObj);
    } else if (res.statusCode >= 400) {
      console.warn('[HTTP]', logObj);
    } else {
      console.log('[HTTP]', logObj);
    }
  });
  next();
});
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 })); // 120 req/min/IP

// Routes
app.use('/auth', authRoutes);
app.use('/vehicles', vehiclesRoutes);
app.use('/shipments', shipmentsRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/admin', adminRoutes);
app.use('/location', locationRoutes);
app.use('/discount-requests', discountRequestsRoutes);
app.use('/users', usersRoutes);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({
    message: 'Cargo360 API is running successfully!',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

app.get('/health', async (req, res) => {
  try {
    const { sequelize } = require('../models');
    
    // Test database connection
    await sequelize.authenticate();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'disconnected',
      error: error.message,
      uptime: process.uptime(),
      version: '1.0.0'
    });
  }
});

// Global error handler
app.use((err, req, res, _next) => {
  // Log enriched error with request context
  const ctx = {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip,
    user: req.user ? { id: req.user.id, role: req.user.role } : undefined,
    params: sanitize(req.params),
    query: sanitize(req.query),
    body: sanitize(req.body),
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    status: err.status || 500,
    code: err.code || 5002
  };
  console.error('[ERROR]', ctx);
  const status = err.status || 500;
  const code = err.code || 5002; // INTERNAL_ERROR
  
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: code,
    status: status
  });
});

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
