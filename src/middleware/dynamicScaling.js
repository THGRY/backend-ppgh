/**
 * DYNAMIC CONNECTION SCALING MIDDLEWARE
 * 
 * Integrates intelligent connection pool management with API routes
 * Provides automatic queuing and prioritization based on system load
 */

const connectionPoolMonitor = require('../services/connectionPoolMonitor');

/**
 * Dynamic scaling middleware for API routes
 * Automatically manages connection pool usage based on request type and system load
 */
function dynamicScalingMiddleware(req, res, next) {
  // Extract endpoint information for scaling decisions
  const endpoint = req.path;
  const queryInfo = {
    endpoint: endpoint,
    fromDate: req.query.from || 'unknown',
    toDate: req.query.to || 'unknown',
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent') || 'unknown'
  };

  // Store query info for use in route handlers
  req.scalingInfo = {
    queryInfo: queryInfo,
    startTime: Date.now()
  };

  // Continue to route handler
  next();
}

/**
 * Wrapper function for database operations with dynamic scaling
 * Use this to wrap any function that performs database queries
 */
async function withDynamicScaling(queryInfo, databaseOperation) {
  let queryId = null;
  
  try {
    // Register query with connection pool monitor
    queryId = await connectionPoolMonitor.beforeQuery(queryInfo);
    
    // Execute the database operation
    const result = await databaseOperation();
    
    // Mark query as successful
    connectionPoolMonitor.afterQuery(queryId, true);
    
    return result;
    
  } catch (error) {
    // Mark query as failed
    if (queryId) {
      connectionPoolMonitor.afterQuery(queryId, false);
    }
    
    throw error;
  }
}

/**
 * Enhanced route wrapper that automatically applies dynamic scaling
 * Wraps existing route handlers to add scaling capabilities
 */
function withScaling(routeHandler) {
  return async (req, res, next) => {
    const { queryInfo, startTime } = req.scalingInfo || {};
    
    if (!queryInfo) {
      // Fallback if middleware wasn't applied
      return routeHandler(req, res, next);
    }
    
    try {
      // Execute route handler with scaling
      await withDynamicScaling(queryInfo, async () => {
        return routeHandler(req, res, next);
      });
      
    } catch (error) {
      console.error(`❌ Scaled route error for ${queryInfo.endpoint}:`, error.message);
      
      // Send error response if not already sent
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Internal server error with dynamic scaling',
          message: error.message,
          endpoint: queryInfo.endpoint
        });
      }
    }
  };
}

/**
 * Get current scaling status for monitoring endpoints
 */
function getScalingStatus() {
  const poolHealth = connectionPoolMonitor.isPoolHealthy();
  const stats = connectionPoolMonitor.getStats();
  
  return {
    connectionPool: {
      active: poolHealth.activeConnections,
      max: poolHealth.maxConnections,
      scalingLevel: poolHealth.scalingLevel,
      healthy: poolHealth.healthy
    },
    queue: {
      totalQueued: poolHealth.queuedRequests,
      totalProcessed: poolHealth.queueStats.totalProcessed,
      averageWaitTime: poolHealth.queueStats.averageWaitTime
    },
    performance: {
      totalQueries: stats.totalQueries,
      connectionErrors: stats.connectionErrors,
      poolExhaustionEvents: stats.poolExhaustionEvents
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  dynamicScalingMiddleware,
  withDynamicScaling,
  withScaling,
  getScalingStatus
};
