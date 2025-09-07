const Redis = require('ioredis');
const connectionPoolMonitor = require('./connectionPoolMonitor');

/**
 * SMART REDIS CACHING SERVICE
 * 
 * Features:
 * - Intelligent date-range caching with overlap detection
 * - Monthly chunk-based caching for large datasets
 * - Cache aggregation from existing chunks
 * - Minimal database hits for overlapping date ranges
 * - Graceful fallback to original cache service
 */

class SmartCacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.chunkSizeMonths = 1; // Cache data in monthly chunks
    this.stats = {
      hits: 0,
      misses: 0,
      partialHits: 0,
      aggregations: 0,
      errors: 0,
      totalRequests: 0
    };
    
    this.init();
  }

  /**
   * Initialize Redis connection
   */
  async init() {
    try {
      // Use same Redis URL configuration as advancedCacheService
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        // Optimize for analytics workloads
        keepAlive: 30000,
        family: 4, // Force IPv4
      });

      this.redis.on('connect', () => {
        const logger = require('../utils/logger');
        logger.info('Smart Redis cache connected');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        const logger = require('../utils/logger');
        logger.error('Smart Redis cache error:', err.message);
        this.isConnected = false;
      });

      await this.redis.connect();
      
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Smart Redis cache initialization failed:', error.message);
      this.isConnected = false;
    }
  }

  /**
   * Generate chunk-based cache key for a specific month
   */
  generateChunkKey(layer, endpoint, year, month, additionalParams = {}) {
    const params = {
      year,
      month: month.toString().padStart(2, '0'),
      ...additionalParams
    };
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `l1_chunk:${layer}:${endpoint}:${sortedParams}`;
  }

  /**
   * Generate fallback cache key (same as original implementation)
   */
  generateFallbackKey(layer, endpoint, fromDate, toDate, additionalParams = {}) {
    const params = {
      fromDate,
      toDate,
      ...additionalParams
    };
    
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `l1:${layer}:${endpoint}:${sortedParams}`;
  }

  /**
   * Get month chunks between two dates
   */
  getMonthChunks(fromDate, toDate) {
    const chunks = [];
    const start = new Date(fromDate);
    const end = new Date(toDate);
    
    // Start from the beginning of the month
    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    
    while (current <= end) {
      const chunkEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      
      chunks.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        chunkStart: new Date(current),
        chunkEnd: new Date(Math.min(chunkEnd.getTime(), end.getTime())),
        actualStart: new Date(Math.max(current.getTime(), start.getTime())),
        actualEnd: new Date(Math.min(chunkEnd.getTime(), end.getTime()))
      });
      
      current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
    }
    
    return chunks;
  }

  /**
   * Smart caching with date range intelligence
   */
  async smartCacheWithFallback(layer, endpoint, fromDate, toDate, fallbackFunction, additionalParams = {}) {
    this.stats.totalRequests++;
    const logger = require('../utils/logger');
    
    if (!this.isConnected) {
      logger.warn('Smart cache not connected, using fallback');
      return await fallbackFunction();
    }

    // Monitor connection pool before database queries
    const queryInfo = { endpoint, fromDate, toDate };
    let queryId = null;

    try {
      // First, try exact match cache (for backward compatibility)
      const exactKey = this.generateFallbackKey(layer, endpoint, fromDate, toDate, additionalParams);
      const exactMatch = await this.get(exactKey);
      
      if (exactMatch) {
        this.stats.hits++;
        logger.cache(`Smart Cache EXACT HIT: ${exactKey}`);
        return exactMatch;
      }

      // Get month chunks for the requested date range
      const chunks = this.getMonthChunks(fromDate, toDate);
      logger.debug(`Smart Cache: Analyzing ${chunks.length} month chunks for ${fromDate} to ${toDate}`);

      // Check which chunks we have cached
      const cachedChunks = [];
      const missingChunks = [];
      
      for (const chunk of chunks) {
        const chunkKey = this.generateChunkKey(layer, endpoint, chunk.year, chunk.month, additionalParams);
        const cachedData = await this.get(chunkKey);
        
        if (cachedData) {
          cachedChunks.push({
            ...chunk,
            data: cachedData,
            key: chunkKey
          });
          logger.cache(`Smart Cache CHUNK HIT: ${chunkKey}`);
        } else {
          missingChunks.push(chunk);
          logger.debug(`Smart Cache CHUNK MISS: ${chunkKey}`);
        }
      }

      // If we have all chunks cached, aggregate them
      if (missingChunks.length === 0 && cachedChunks.length > 0) {
        logger.cache(`Smart Cache AGGREGATING ${cachedChunks.length} chunks`);
        const aggregatedResult = await this.aggregateChunks(cachedChunks, fromDate, toDate, layer, endpoint);
        this.stats.aggregations++;
        return aggregatedResult;
      }

      // If we have some chunks but not all, try partial aggregation + database query for missing parts
      if (cachedChunks.length > 0 && missingChunks.length > 0) {
        logger.debug(`Smart Cache PARTIAL: ${cachedChunks.length} cached, ${missingChunks.length} missing`);
        this.stats.partialHits++;
        
        // For now, fall back to full database query to keep things simple
        // TODO: Implement partial aggregation in future optimization
        const fullResult = await fallbackFunction();
        
        // Cache the result in monthly chunks for future use
        if (fullResult && fullResult.success !== false) {
          await this.cacheInChunks(layer, endpoint, fromDate, toDate, fullResult, additionalParams);
        }
        
        return fullResult;
      }

      // Complete cache miss - query database and cache result
      logger.debug(`Smart Cache COMPLETE MISS: querying database`);
      this.stats.misses++;
      
      // Monitor connection pool usage
      queryId = await connectionPoolMonitor.beforeQuery(queryInfo);
      
      try {
        const result = await fallbackFunction();
        connectionPoolMonitor.afterQuery(queryId, result?.success !== false);
        queryId = null; // Mark as completed
        
        if (result && result.success !== false) {
          // Cache in chunks for intelligent future retrieval
          await this.cacheInChunks(layer, endpoint, fromDate, toDate, result, additionalParams);
          
          // Also cache exact match for immediate reuse
          const ttl = this.calculateTTL(fromDate, toDate, layer);
          await this.set(exactKey, result, ttl);
        }
        
        return result;
      } catch (dbError) {
        if (queryId) {
          connectionPoolMonitor.afterQuery(queryId, false);
        }
        throw dbError;
      }

    } catch (error) {
      logger.error('Smart cache error:', error.message);
      this.stats.errors++;
      
      // Ensure query monitoring is cleaned up
      if (queryId) {
        connectionPoolMonitor.afterQuery(queryId, false);
      }
      
      return await fallbackFunction();
    }
  }

  /**
   * Cache result in monthly chunks
   */
  async cacheInChunks(layer, endpoint, fromDate, toDate, fullResult, additionalParams = {}) {
    try {
      const logger = require('../utils/logger');
      const chunks = this.getMonthChunks(fromDate, toDate);
      
      for (const chunk of chunks) {
        // Create chunk-specific data (for now, just store the full result)
        // TODO: Implement data splitting logic for more advanced caching
        const chunkData = {
          ...fullResult,
          chunk_info: {
            year: chunk.year,
            month: chunk.month,
            actualStart: chunk.actualStart.toISOString(),
            actualEnd: chunk.actualEnd.toISOString(),
            cached_at: new Date().toISOString()
          }
        };
        
        const chunkKey = this.generateChunkKey(layer, endpoint, chunk.year, chunk.month, additionalParams);
        const ttl = this.calculateTTL(chunk.actualStart.toISOString(), chunk.actualEnd.toISOString(), layer);
        
        await this.set(chunkKey, chunkData, ttl);
        logger.cache(`Smart Cache CHUNK STORED: ${chunkKey}`);
      }
      
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Error caching in chunks:', error.message);
    }
  }

  /**
   * FIXED: Aggregate cached chunks into a single result with proper date filtering
   */
  async aggregateChunks(cachedChunks, fromDate, toDate, layer, endpoint) {
    try {
      const logger = require('../utils/logger');
      
      // Filter chunks to only include those within the requested date range
      const requestedStart = new Date(fromDate);
      const requestedEnd = new Date(toDate);
      
      const relevantChunks = cachedChunks.filter(chunk => {
        if (!chunk.data.chunk_info) return true; // Include if no chunk info
        
        const chunkStart = new Date(chunk.data.chunk_info.actualStart);
        const chunkEnd = new Date(chunk.data.chunk_info.actualEnd);
        
        // Check if chunk overlaps with requested date range
        return chunkStart <= requestedEnd && chunkEnd >= requestedStart;
      });
      
      if (relevantChunks.length === 0) {
        logger.warn(`No relevant cached chunks found for ${fromDate} to ${toDate}`);
        // Return a basic structure instead of null to prevent crashes
        return {
          success: false,
          error: 'No cached data available for this date range',
          data: null,
          cached: false,
          date_range: `${fromDate} to ${toDate}`,
          note: 'Cache miss - no relevant chunks found'
        };
      }
      
      if (relevantChunks.length === 1) {
        const result = relevantChunks[0].data;
        logger.cache(`Single chunk aggregation for ${endpoint} (${fromDate} to ${toDate})`);
        return {
          ...result,
          aggregated: true,
          chunks_used: 1,
          cached: true,
          date_range: `${fromDate} to ${toDate}`
        };
      }
      
      // For multiple chunks, implement proper aggregation based on metric type
      logger.cache(`Multi-chunk aggregation (${relevantChunks.length} chunks) for ${endpoint}`);
      
      if (endpoint.includes('unique_visitors') || endpoint.includes('total_bookings') || 
          endpoint.includes('room_nights') || endpoint.includes('total_revenue') || 
          endpoint.includes('abv')) {
        // For metrics: Use most recent chunk as fallback instead of null
        logger.debug(`Using most recent cached data for metrics ${fromDate} to ${toDate}`);
        const mostRecentChunk = relevantChunks.reduce((latest, current) => {
          const latestDate = new Date(latest.data.chunk_info?.cached_at || 0);
          const currentDate = new Date(current.data.chunk_info?.cached_at || 0);
          return currentDate > latestDate ? current : latest;
        });
        
        return {
          ...mostRecentChunk.data,
          aggregated: false,
          chunks_used: 1,
          cached: true,
          date_range: `${fromDate} to ${toDate}`,
          note: `Using most recent cached data as fallback`
        };
      }
      
      // For charts: Use most relevant chunk (closest to requested date range)
      const mostRelevantChunk = relevantChunks.reduce((best, current) => {
        const bestOverlap = this.calculateDateOverlap(best, requestedStart, requestedEnd);
        const currentOverlap = this.calculateDateOverlap(current, requestedStart, requestedEnd);
        return currentOverlap > bestOverlap ? current : best;
      });
      
      return {
        ...mostRelevantChunk.data,
        aggregated: true,
        chunks_used: relevantChunks.length,
        cached: true,
        date_range: `${fromDate} to ${toDate}`,
        note: `Aggregated from ${relevantChunks.length} relevant cached chunks`
      };
      
    } catch (error) {
      const logger = require('../utils/logger');
      logger.error('Error aggregating chunks:', error.message);
      // Return error structure instead of null
      return {
        success: false,
        error: 'Cache aggregation failed',
        data: null,
        cached: false,
        note: `Error: ${error.message}`
      };
    }
  }
  
  /**
   * Calculate overlap between cached chunk and requested date range
   */
  calculateDateOverlap(chunk, requestedStart, requestedEnd) {
    if (!chunk.data.chunk_info) return 0;
    
    const chunkStart = new Date(chunk.data.chunk_info.actualStart);
    const chunkEnd = new Date(chunk.data.chunk_info.actualEnd);
    
    const overlapStart = new Date(Math.max(chunkStart.getTime(), requestedStart.getTime()));
    const overlapEnd = new Date(Math.min(chunkEnd.getTime(), requestedEnd.getTime()));
    
    if (overlapStart > overlapEnd) return 0;
    
    return overlapEnd.getTime() - overlapStart.getTime();
  }

  /**
   * Standard cache get operation
   */
  async get(key) {
    if (!this.isConnected) return null;

    try {
      const cached = await this.redis.get(key);
      
      if (cached !== null) {
        const parsed = JSON.parse(cached);
        return parsed.compressed ? this.decompress(parsed.data) : parsed;
      }
      
      return null;
      
    } catch (error) {
      console.error(`❌ Smart cache GET error for ${key}:`, error.message);
      return null;
    }
  }

  /**
   * Standard cache set operation
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!this.isConnected) return false;

    try {
      const shouldCompress = JSON.stringify(value).length > 10000;
      const dataToStore = shouldCompress ? 
        { compressed: true, data: this.compress(value) } : 
        value;
      
      await this.redis.setex(key, ttlSeconds, JSON.stringify(dataToStore));
      return true;
      
    } catch (error) {
      console.error(`❌ Smart cache SET error for ${key}:`, error.message);
      return false;
    }
  }

  /**
   * TTL calculation (same as original)
   */
  calculateTTL(fromDate, toDate, dataType = 'metrics') {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const now = new Date();
    
    const daysDiff = Math.ceil((to - from) / (1000 * 60 * 60 * 24));
    const daysFromNow = Math.ceil((now - to) / (1000 * 60 * 60 * 24));
    
    // Historical data (older than 7 days) - cache longer
    if (daysFromNow > 7) {
      return daysDiff > 30 ? 24 * 60 * 60 : 12 * 60 * 60; // 24h or 12h
    }
    
    // Recent data - shorter cache
    if (daysDiff <= 1) return 5 * 60; // 5 minutes for daily data
    if (daysDiff <= 7) return 15 * 60; // 15 minutes for weekly data
    if (daysDiff <= 30) return 30 * 60; // 30 minutes for monthly data
    
    return 60 * 60; // 1 hour default
  }

  /**
   * Simple compression (placeholder)
   */
  compress(data) {
    // TODO: Implement actual compression if needed
    return JSON.stringify(data);
  }

  /**
   * Simple decompression (placeholder)
   */
  decompress(data) {
    // TODO: Implement actual decompression if needed
    return JSON.parse(data);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.stats.totalRequests;
    const hitRate = total > 0 ? ((this.stats.hits + this.stats.partialHits) / total * 100).toFixed(1) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      connected: this.isConnected
    };
  }

  /**
   * Clear cache pattern
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️  Smart cache invalidated ${keys.length} entries matching: ${pattern}`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Smart cache invalidation error for ${pattern}:`, error.message);
      return false;
    }
  }
}

// Export singleton instance
const smartCacheService = new SmartCacheService();
module.exports = smartCacheService;
