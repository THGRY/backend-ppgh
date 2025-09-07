/**
 * PERFORMANCE-OPTIMIZED LOGGER
 * 
 * Replaces console.log statements throughout the codebase
 * with conditional logging that can be disabled in production
 * for better API performance.
 */

class PerformanceLogger {
  constructor() {
    // Only enable detailed logging in development
    this.enabledLevels = {
      error: true,  // Always enabled
      warn: true,   // Always enabled
      info: process.env.NODE_ENV === 'development',
      debug: process.env.NODE_ENV === 'development' && process.env.DEBUG_MODE === 'true',
      query: process.env.QUERY_LOGGING === 'true'
    };
    
    this.stats = {
      totalLogs: 0,
      skippedLogs: 0
    };
  }

  error(message, ...args) {
    if (this.enabledLevels.error) {
      console.error(`❌ ${message}`, ...args);
    }
    this.stats.totalLogs++;
  }

  warn(message, ...args) {
    if (this.enabledLevels.warn) {
      console.warn(`⚠️  ${message}`, ...args);
    }
    this.stats.totalLogs++;
  }

  info(message, ...args) {
    if (this.enabledLevels.info) {
      console.log(`ℹ️  ${message}`, ...args);
    } else {
      this.stats.skippedLogs++;
    }
    this.stats.totalLogs++;
  }

  debug(message, ...args) {
    if (this.enabledLevels.debug) {
      console.log(`🐛 ${message}`, ...args);
    } else {
      this.stats.skippedLogs++;
    }
    this.stats.totalLogs++;
  }

  query(message, ...args) {
    if (this.enabledLevels.query) {
      console.log(`🔍 ${message}`, ...args);
    } else {
      this.stats.skippedLogs++;
    }
    this.stats.totalLogs++;
  }

  success(message, ...args) {
    if (this.enabledLevels.info) {
      console.log(`✅ ${message}`, ...args);
    } else {
      this.stats.skippedLogs++;
    }
    this.stats.totalLogs++;
  }

  cache(message, ...args) {
    if (this.enabledLevels.debug) {
      console.log(`🎯 ${message}`, ...args);
    } else {
      this.stats.skippedLogs++;
    }
    this.stats.totalLogs++;
  }

  performance(message, ...args) {
    if (this.enabledLevels.debug) {
      console.log(`⚡ ${message}`, ...args);
    } else {
      this.stats.skippedLogs++;
    }
    this.stats.totalLogs++;
  }

  getStats() {
    return {
      ...this.stats,
      performanceSaving: `${((this.stats.skippedLogs / this.stats.totalLogs) * 100).toFixed(1)}%`
    };
  }
}

// Export singleton instance
const logger = new PerformanceLogger();
module.exports = logger;
