require('dotenv').config(); // Load environment variables from .env FIRST
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Import routes
const l1Routes = require('./routes/l1Routes');

// Import dynamic scaling middleware
const { dynamicScalingMiddleware, getScalingStatus } = require('./middleware/dynamicScaling');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for frontend
app.use(morgan('combined')); // Logging
app.use(compression()); // Gzip compression
app.use(express.json()); // Parse JSON bodies

// Apply dynamic scaling middleware to all routes
app.use(dynamicScalingMiddleware);

// Health check endpoint with database connection verification
app.get('/health', async (req, res) => {
  try {
    // Import health check function
    const { checkConnectionHealth } = require('./services/l1MetricsService');
    
    // Check database connection health
    const dbHealth = await checkConnectionHealth();
    
    const response = {
      status: dbHealth.overall.healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'L1 Metrics API',
      database: {
        status: dbHealth.database.healthy ? 'connected' : 'disconnected',
        connection: 'Azure SQL Server',
        pooling: 'Active (35 max connections)',
        last_check: dbHealth.database.timestamp
      }
    };
    
    if (!dbHealth.overall.healthy) {
      response.database.error = dbHealth.database.error;
      return res.status(503).json(response);
    }
    
    res.json(response);
    
  } catch (error) {
    const logger = require('./utils/logger');
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'L1 Metrics API',
      database: {
        status: 'error',
        error: error.message
      }
    });
  }
});

// Dynamic scaling stats endpoint
app.get('/scaling-stats', async (req, res) => {
  try {
    const scalingStatus = getScalingStatus();
    
    res.json({
      success: true,
      scaling: scalingStatus,
      message: 'Dynamic connection scaling is active'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get scaling stats',
      message: error.message
    });
  }
});

// API routes
app.use('/api', l1Routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    requested_path: req.path,
    available_endpoints: [
      'GET /health',
      '--- KEY METRICS ---',
      'GET /api/l1-summary-data?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-unique-visitors?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-total-bookings?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-room-nights?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-total-revenue?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-abv?from=YYYY-MM-DD&to=YYYY-MM-DD',
      '--- CHARTS ---',
      'GET /api/l1-awareness-engagement?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-conversions?from=YYYY-MM-DD&to=YYYY-MM-DD',
      'GET /api/l1-stay-poststay?from=YYYY-MM-DD&to=YYYY-MM-DD',
      '--- HELPERS ---',
      'GET /api/l1-date-ranges'
    ]
  });
});

// Error handler
app.use((error, req, res, next) => {
  const logger = require('./utils/logger');
  logger.error('API Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
