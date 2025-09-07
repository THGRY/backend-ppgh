require('dotenv').config(); // Load environment variables from .env FIRST
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Import routes
const l1Routes = require('./routes/l1Routes');

// Import cache warming service
const cacheWarmingService = require('./services/cacheWarmingService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for frontend
app.use(morgan('combined')); // Logging
app.use(compression()); // Gzip compression
app.use(express.json()); // Parse JSON bodies

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
        pooling: 'Active (20 max connections)',
        last_check: dbHealth.database.timestamp
      },
      cache: {
        status: dbHealth.cache.healthy ? 'connected' : 'disconnected',
        connection: 'Redis Cloud',
        performance: dbHealth.cache.stats || 'Not available',
        latency: dbHealth.cache.latency || 'Unknown'
      }
    };
    
    if (!dbHealth.healthy) {
      response.database.error = dbHealth.error;
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

// Cache performance endpoint
app.get('/cache-stats', async (req, res) => {
  try {
    const smartCacheService = require('./services/smartCacheService');
    const cacheStats = smartCacheService.getOptimizedStats();
    const warmingStats = cacheWarmingService.getStats();
    
    res.json({
      cache: cacheStats,
      warming: warmingStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get cache stats',
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
  const logger = require('./utils/logger');
  logger.success(`L1 Metrics API running on http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.debug(`Example: http://localhost:${PORT}/api/l1-summary-data?from=2025-07-01&to=2025-07-07`);
  logger.info(`Smart Redis caching enabled with optimized performance`);
  
  // Start cache warming service
  cacheWarmingService.scheduleWarming();
});

module.exports = app;
