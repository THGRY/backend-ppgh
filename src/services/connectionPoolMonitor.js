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
    
    this.maxConcurrentQueries = 16; // Leave 4 connections for other operations (out of 20 total)
    this.activeQueries = new Set();
    
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
   * Before executing a database query
   */
  async beforeQuery(queryInfo) {
    this.connectionStats.totalQueries++;
    
    // Check if we're approaching connection pool limit
    if (this.activeQueries.size >= this.maxConcurrentQueries) {
      this.connectionStats.poolExhaustionEvents++;
      this.connectionStats.lastPoolExhaustion = new Date().toISOString();
      
      console.warn(`⚠️  Connection Pool Warning: ${this.activeQueries.size}/${this.maxConcurrentQueries} concurrent queries`);
      console.warn(`   Active queries: ${Array.from(this.activeQueries).join(', ')}`);
      
      // Wait for a connection to become available
      await this.waitForAvailableConnection();
    }
    
    // Track this query
    const queryId = `${queryInfo.endpoint}_${Date.now()}`;
    this.activeQueries.add(queryId);
    
    this.connectionStats.queryHistory.push({
      queryId,
      endpoint: queryInfo.endpoint,
      startTime: Date.now(),
      dateRange: `${queryInfo.fromDate} to ${queryInfo.toDate}`
    });
    
    return queryId;
  }

  /**
   * After query execution
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
  }

  /**
   * Wait for connection to become available
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
   * Log connection statistics
   */
  logConnectionStats() {
    if (this.connectionStats.totalQueries > 0) {
      const recent = this.connectionStats.queryHistory.slice(-10);
      const avgDuration = recent.reduce((sum, q) => sum + (q.duration || 0), 0) / recent.length;
      
      console.log('📊 Connection Pool Stats:');
      console.log(`   Active Queries: ${this.activeQueries.size}/${this.maxConcurrentQueries}`);
      console.log(`   Total Queries: ${this.connectionStats.totalQueries}`);
      console.log(`   Connection Errors: ${this.connectionStats.connectionErrors}`);
      console.log(`   Pool Exhaustion Events: ${this.connectionStats.poolExhaustionEvents}`);
      console.log(`   Avg Query Duration: ${Math.round(avgDuration)}ms`);
      
      if (this.activeQueries.size > 0) {
        console.log(`   Current Active: ${Array.from(this.activeQueries).join(', ')}`);
      }
    }
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
   * Check if connection pool is healthy
   */
  isPoolHealthy() {
    return {
      healthy: this.activeQueries.size < this.maxConcurrentQueries,
      activeConnections: this.activeQueries.size,
      maxConnections: this.maxConcurrentQueries,
      connectionErrors: this.connectionStats.connectionErrors,
      poolExhaustionEvents: this.connectionStats.poolExhaustionEvents
    };
  }
}

// Export singleton instance
const connectionPoolMonitor = new ConnectionPoolMonitor();
module.exports = connectionPoolMonitor;
