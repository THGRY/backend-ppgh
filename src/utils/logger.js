/**
 * MINIMAL LOGGER - PERFORMANCE OPTIMIZED
 * 
 * Only essential logging for production performance
 */

class MinimalLogger {
  // Only errors - everything else is disabled for performance
  error(message, ...args) {
    console.error(`ERROR: ${message}`, ...args);
  }

  // All other methods are no-ops for maximum performance
  warn() {}
  info() {}
  debug() {}
  query() {}
  success() {}
  cache() {}
  performance() {}
  
  getStats() {
    return { message: 'Logging disabled for performance' };
  }
}

// Export singleton instance
const logger = new MinimalLogger();
module.exports = logger;
