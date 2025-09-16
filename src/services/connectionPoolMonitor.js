/**
 * CONNECTION POOL MONITORING SERVICE
 * 
 * Monitors database connection pool usage and prevents exhaustion
 * Provides insights into connection patterns and potential bottlenecks
 */

class ConnectionPoolMonitor {
  constructor() {
    this.connectionStats = {
      activeConnections: 0,
      totalQueries: 0,
      connectionErrors: 0,
      poolExhaustionEvents: 0,
      lastPoolExhaustion: null,
      queryHistory: []
    };
    
    this.maxConcurrentQueries = 30; // Leave 5 connections for other operations (out of 35 total)
    this.activeQueries = new Set();
    
    // DYNAMIC SCALING CONFIGURATION
    this.scalingConfig = {
      // Connection thresholds for different scaling levels
      thresholds: {
        GREEN: 15,    // 0-15 connections: Normal operation
        YELLOW: 22,   // 16-22 connections: Start queuing heavy requests
        ORANGE: 27,   // 23-27 connections: Queue all non-critical requests
        RED: 30       // 28-30 connections: Emergency mode - critical only
      },
      
      // Request priority levels
      priorities: {
        CRITICAL: 1,   // Health checks, system operations
        HIGH: 2,       // Single metric queries (fast)
        MEDIUM: 3,     // Chart APIs (2 connections each)
        LOW: 4         // Summary API (5 connections)
      },
      
      // Queue management
      requestQueue: new Map(), // Priority-based queues
      queueStats: {
        totalQueued: 0,
        totalProcessed: 0,
        averageWaitTime: 0
      }
    };
    
    // Initialize priority queues
    Object.values(this.scalingConfig.priorities).forEach(priority => {
      this.scalingConfig.requestQueue.set(priority, []);
    });
    
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start periodic monitoring
   */
  startMonitoring() {
    // Log connection stats every 30 seconds
    setInterval(() => {
      this.logConnectionStats();
    }, 30000);
    
    // Clean old query history every 5 minutes
    setInterval(() => {
      this.cleanQueryHistory();
    }, 300000);
  }

  /**
   * DYNAMIC SCALING: Before executing a database query
   * Implements intelligent queuing based on connection pool load
   */
  async beforeQuery(queryInfo) {
    this.connectionStats.totalQueries++;
    
    // Determine request priority based on endpoint
    const priority = this.getRequestPriority(queryInfo.endpoint);
    const currentLoad = this.activeQueries.size;
    const scalingLevel = this.getScalingLevel(currentLoad);
    
    // DYNAMIC SCALING LOGIC
    const shouldQueue = this.shouldQueueRequest(priority, scalingLevel, queryInfo);
    
    if (shouldQueue) {
      await this.queueRequest(queryInfo, priority);
    }
    
    // Final check for pool exhaustion (safety net)
    if (this.activeQueries.size >= this.maxConcurrentQueries) {
      this.connectionStats.poolExhaustionEvents++;
      this.connectionStats.lastPoolExhaustion = new Date().toISOString();
      
      console.warn(`🚨 EMERGENCY: Pool exhaustion - waiting for connection`);
      await this.waitForAvailableConnection();
    }
    
    // Track this query
    const queryId = `${queryInfo.endpoint}_${Date.now()}`;
    this.activeQueries.add(queryId);
    
    this.connectionStats.queryHistory.push({
      queryId,
      endpoint: queryInfo.endpoint,
      startTime: Date.now(),
      dateRange: `${queryInfo.fromDate} to ${queryInfo.toDate}`,
      priority: priority,
      scalingLevel: scalingLevel,
      wasQueued: shouldQueue
    });
    
    return queryId;
  }

  /**
   * After query execution - with queue processing
   */
  afterQuery(queryId, success = true) {
    this.activeQueries.delete(queryId);
    
    if (!success) {
      this.connectionStats.connectionErrors++;
    }
    
    // Update query history with completion time
    const queryHistoryItem = this.connectionStats.queryHistory.find(q => q.queryId === queryId);
    if (queryHistoryItem) {
      queryHistoryItem.endTime = Date.now();
      queryHistoryItem.duration = queryHistoryItem.endTime - queryHistoryItem.startTime;
      queryHistoryItem.success = success;
    }
    
    // DYNAMIC SCALING: Process next queued request
    this.processNextQueuedRequest();
  }

  /**
   * DYNAMIC SCALING: Determine request priority based on endpoint
   */
  getRequestPriority(endpoint) {
    const { priorities } = this.scalingConfig;
    
    // Health and system endpoints
    if (endpoint.includes('health') || endpoint.includes('date-ranges')) {
      return priorities.CRITICAL;
    }
    
    // Single metric endpoints (fast queries)
    if (endpoint.includes('unique-visitors') || 
        endpoint.includes('total-bookings') || 
        endpoint.includes('room-nights') || 
        endpoint.includes('total-revenue') || 
        endpoint.includes('abv')) {
      return priorities.HIGH;
    }
    
    // Chart endpoints (medium load - 2 queries each)
    if (endpoint.includes('awareness-engagement') || 
        endpoint.includes('conversions') || 
        endpoint.includes('stay-poststay')) {
      return priorities.MEDIUM;
    }
    
    // Summary endpoint (heavy load - 5 parallel queries)
    if (endpoint.includes('summary-data')) {
      return priorities.LOW;
    }
    
    // Default to medium priority
    return priorities.MEDIUM;
  }

  /**
   * DYNAMIC SCALING: Determine current scaling level based on connection load
   */
  getScalingLevel(currentConnections) {
    const { thresholds } = this.scalingConfig;
    
    if (currentConnections <= thresholds.GREEN) return 'GREEN';
    if (currentConnections <= thresholds.YELLOW) return 'YELLOW';
    if (currentConnections <= thresholds.ORANGE) return 'ORANGE';
    return 'RED';
  }

  /**
   * DYNAMIC SCALING: Determine if request should be queued
   */
  shouldQueueRequest(priority, scalingLevel, queryInfo) {
    const { priorities } = this.scalingConfig;
    
    switch (scalingLevel) {
      case 'GREEN':
        return false; // Normal operation - no queuing
        
      case 'YELLOW':
        // Queue only heavy requests (Summary API)
        return priority === priorities.LOW;
        
      case 'ORANGE':
        // Queue medium and low priority requests
        return priority >= priorities.MEDIUM;
        
      case 'RED':
        // Emergency mode - queue everything except critical
        return priority > priorities.CRITICAL;
        
      default:
        return false;
    }
  }

  /**
   * DYNAMIC SCALING: Queue a request with priority
   */
  async queueRequest(queryInfo, priority) {
    const queuedRequest = {
      queryInfo,
      priority,
      queueTime: Date.now(),
      resolve: null,
      reject: null
    };
    
    // Add to appropriate priority queue
    const queue = this.scalingConfig.requestQueue.get(priority);
    queue.push(queuedRequest);
    
    this.scalingConfig.queueStats.totalQueued++;
    
    // Return a promise that will be resolved when request can proceed
    return new Promise((resolve, reject) => {
      queuedRequest.resolve = resolve;
      queuedRequest.reject = reject;
    });
  }

  /**
   * DYNAMIC SCALING: Process next queued request (highest priority first)
   */
  processNextQueuedRequest() {
    // Check if we have capacity for more requests
    if (this.activeQueries.size >= this.maxConcurrentQueries) {
      return; // Still at capacity
    }
    
    // Find highest priority queue with requests
    const { priorities, requestQueue } = this.scalingConfig;
    
    for (const priority of Object.values(priorities).sort()) {
      const queue = requestQueue.get(priority);
      
      if (queue.length > 0) {
        const queuedRequest = queue.shift();
        const waitTime = Date.now() - queuedRequest.queueTime;
        
        // Update queue statistics
        this.scalingConfig.queueStats.totalProcessed++;
        const totalWait = this.scalingConfig.queueStats.averageWaitTime * (this.scalingConfig.queueStats.totalProcessed - 1);
        this.scalingConfig.queueStats.averageWaitTime = (totalWait + waitTime) / this.scalingConfig.queueStats.totalProcessed;
        
        
        // Resolve the queued promise to allow request to proceed
        queuedRequest.resolve();
        break;
      }
    }
  }

  /**
   * Wait for connection to become available (fallback mechanism)
   */
  async waitForAvailableConnection() {
    return new Promise((resolve) => {
      const checkConnection = () => {
        if (this.activeQueries.size < this.maxConcurrentQueries) {
          resolve();
        } else {
          setTimeout(checkConnection, 100); // Check every 100ms
        }
      };
      checkConnection();
    });
  }

  /**
   * Log connection statistics with dynamic scaling info
   */
  logConnectionStats() {
    if (this.connectionStats.totalQueries > 0) {
      const recent = this.connectionStats.queryHistory.slice(-10);
      const avgDuration = recent.reduce((sum, q) => sum + (q.duration || 0), 0) / recent.length;
      const currentLoad = this.activeQueries.size;
      const scalingLevel = this.getScalingLevel(currentLoad);
      
      // Count queued requests
      const totalQueued = Array.from(this.scalingConfig.requestQueue.values())
        .reduce((sum, queue) => sum + queue.length, 0);
      
    }
  }

  /**
   * Get breakdown of queued requests by priority
   */
  getQueueBreakdown() {
    const breakdown = [];
    const { priorities, requestQueue } = this.scalingConfig;
    
    for (const [priorityName, priorityValue] of Object.entries(priorities)) {
      const queueLength = requestQueue.get(priorityValue).length;
      if (queueLength > 0) {
        breakdown.push(`${priorityName}:${queueLength}`);
      }
    }
    
    return breakdown.join(', ') || 'None';
  }

  /**
   * Clean old query history
   */
  cleanQueryHistory() {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    this.connectionStats.queryHistory = this.connectionStats.queryHistory.filter(
      q => q.startTime > fiveMinutesAgo
    );
  }

  /**
   * Get current connection statistics
   */
  getStats() {
    return {
      ...this.connectionStats,
      activeQueriesCount: this.activeQueries.size,
      activeQueriesList: Array.from(this.activeQueries)
    };
  }

  /**
   * Check if connection pool is healthy (with dynamic scaling info)
   */
  isPoolHealthy() {
    const currentLoad = this.activeQueries.size;
    const scalingLevel = this.getScalingLevel(currentLoad);
    const totalQueued = Array.from(this.scalingConfig.requestQueue.values())
      .reduce((sum, queue) => sum + queue.length, 0);
    
    return {
      healthy: currentLoad < this.maxConcurrentQueries,
      activeConnections: currentLoad,
      maxConnections: this.maxConcurrentQueries,
      scalingLevel: scalingLevel,
      queuedRequests: totalQueued,
      connectionErrors: this.connectionStats.connectionErrors,
      poolExhaustionEvents: this.connectionStats.poolExhaustionEvents,
      queueStats: {
        totalQueued: this.scalingConfig.queueStats.totalQueued,
        totalProcessed: this.scalingConfig.queueStats.totalProcessed,
        averageWaitTime: Math.round(this.scalingConfig.queueStats.averageWaitTime)
      }
    };
  }
}

// Export singleton instance
const connectionPoolMonitor = new ConnectionPoolMonitor();
module.exports = connectionPoolMonitor;
