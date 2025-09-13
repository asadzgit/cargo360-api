const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { port, corsOrigin } = require('../config/env');
const authRoutes = require('./routes/auth.routes');
const vehiclesRoutes = require('./routes/vehicles.routes');
const shipmentsRoutes = require('./routes/shipments.routes');
const reviewsRoutes = require('./routes/reviews.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 })); // 120 req/min/IP

// Routes
app.use('/auth', authRoutes);
app.use('/vehicles', vehiclesRoutes);
app.use('/shipments', shipmentsRoutes);
app.use('/reviews', reviewsRoutes);
app.use('/admin', adminRoutes);

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
  console.error(err);
  const status = err.status || 500;
  const code = err.code || 5002; // INTERNAL_ERROR
  
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: code,
    status: status
  });
});

app.listen(port, () => console.log(`API running on http://localhost:${port}`));
