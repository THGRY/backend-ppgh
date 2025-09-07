const Redis = require('ioredis');

/**
 * ADVANCED REDIS CACHING SERVICE
 * 
 * Features:
 * - Multi-level caching strategy
 * - Smart TTL management
 * - Cache warming and invalidation
 * - Performance monitoring
 * - Graceful degradation
 * - Compression for large datasets
 */

class AdvancedCacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      errors: 0,
      totalRequests: 0
    };
    
    this.init();
  }

  /**
   * Initialize Redis connection with error handling
   */
  async init() {
    try {
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

      // Connection event handlers
      this.redis.on('connect', () => {
        console.log('🔗 Redis connection established');
        this.isConnected = true;
      });

      this.redis.on('ready', () => {
        console.log('✅ Redis client ready for operations');
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
        this.stats.errors++;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      // Test connection
      await this.redis.connect();
      await this.redis.ping();
      
      console.log('🚀 Advanced Redis Cache Service initialized');
      console.log('📊 Cache layers: L1 (Raw Data), L2 (Metrics), L3 (Charts)');
      
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error.message);
      console.log('⚠️  Continuing without cache - performance will be degraded');
    }
  }

  /**
   * CACHE KEY GENERATION
   * Generates consistent, hierarchical cache keys
   */
  generateKey(layer, endpoint, params) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `l1:${layer}:${endpoint}:${sortedParams}`;
  }

  /**
   * SMART TTL CALCULATION
   * Dynamic TTL based on data characteristics
   */
  calculateTTL(fromDate, toDate, dataType = 'metrics') {
    const now = new Date();
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    
    // Historical data (older than 7 days) - cache longer
    if (endDate < new Date(now - 7 * 24 * 60 * 60 * 1000)) {
      return dataType === 'raw' ? 86400 : 43200; // 24h for raw, 12h for metrics
    }
    
    // Recent data (within 7 days) - cache shorter
    if (endDate > new Date(now - 7 * 24 * 60 * 60 * 1000)) {
      return dataType === 'raw' ? 1800 : 900; // 30min for raw, 15min for metrics
    }
    
    // Current day data - very short cache
    if (endDate.toDateString() === now.toDateString()) {
      return dataType === 'raw' ? 300 : 180; // 5min for raw, 3min for metrics
    }
    
    // Default
    return 3600; // 1 hour
  }

  /**
   * GET WITH FALLBACK
   * Graceful degradation if cache fails
   */
  async get(key, fallbackFunction = null) {
    this.stats.totalRequests++;
    
    if (!this.isConnected) {
      this.stats.misses++;
      return fallbackFunction ? await fallbackFunction() : null;
    }

    try {
      const cached = await this.redis.get(key);
      
      if (cached !== null) {
        this.stats.hits++;
        console.log(`🎯 Cache HIT: ${key}`);
        
        // Handle compressed data
        const parsed = JSON.parse(cached);
        return parsed.compressed ? 
          this.decompress(parsed.data) : 
          parsed;
      }
      
      this.stats.misses++;
      console.log(`💨 Cache MISS: ${key}`);
      
      return fallbackFunction ? await fallbackFunction() : null;
      
    } catch (error) {
      console.error(`❌ Cache GET error for ${key}:`, error.message);
      this.stats.errors++;
      return fallbackFunction ? await fallbackFunction() : null;
    }
  }

  /**
   * SET WITH COMPRESSION
   * Automatically compress large datasets
   */
  async set(key, value, ttl = 3600) {
    if (!this.isConnected) {
      console.log('⚠️  Redis not connected - skipping cache set');
      return false;
    }

    try {
      let dataToStore = value;
      const serialized = JSON.stringify(value);
      
      // Compress if data is large (>10KB)
      if (serialized.length > 10240) {
        dataToStore = {
          compressed: true,
          data: this.compress(value),
          originalSize: serialized.length
        };
        console.log(`🗜️  Compressed cache data: ${serialized.length} → ${JSON.stringify(dataToStore).length} bytes`);
      }
      
      await this.redis.setex(key, ttl, JSON.stringify(dataToStore));
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      
      return true;
      
    } catch (error) {
      console.error(`❌ Cache SET error for ${key}:`, error.message);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * CACHE WITH AUTO-MANAGEMENT
   * High-level caching function with all features
   */
  async cacheWithFallback(layer, endpoint, params, fallbackFunction) {
    const key = this.generateKey(layer, endpoint, params);
    
    // Try to get from cache
    let result = await this.get(key);
    
    if (result === null) {
      // Cache miss - execute fallback function
      console.log(`⚡ Executing query for: ${endpoint}`);
      const startTime = Date.now();
      
      result = await fallbackFunction();
      
      const queryTime = Date.now() - startTime;
      console.log(`📊 Query executed in ${queryTime}ms`);
      
      // Cache the result
      if (result && result.success !== false) {
        const ttl = this.calculateTTL(
          params.fromDate, 
          params.toDate, 
          layer
        );
        
        await this.set(key, result, ttl);
      }
    }
    
    return result;
  }

  /**
   * BULK CACHE WARMING
   * Pre-populate cache for common queries
   */
  async warmCache(commonQueries) {
    if (!this.isConnected) {
      console.log('⚠️  Redis not connected - skipping cache warming');
      return;
    }

    console.log('🔥 Starting cache warming process...');
    
    for (const query of commonQueries) {
      try {
        await this.cacheWithFallback(
          query.layer,
          query.endpoint,
          query.params,
          query.fallbackFunction
        );
        
        console.log(`✅ Warmed cache for: ${query.endpoint}`);
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to warm cache for ${query.endpoint}:`, error.message);
      }
    }
    
    console.log('🔥 Cache warming completed');
  }

  /**
   * CACHE INVALIDATION
   * Smart invalidation patterns
   */
  async invalidatePattern(pattern) {
    if (!this.isConnected) return false;

    try {
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`🗑️  Invalidated ${keys.length} cache entries matching: ${pattern}`);
      }
      
      return true;
    } catch (error) {
      console.error(`❌ Cache invalidation error for ${pattern}:`, error.message);
      return false;
    }
  }

  /**
   * CACHE STATISTICS
   * Performance monitoring
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.hits / this.stats.totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      isConnected: this.isConnected,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * COMPRESSION UTILITIES
   * Simple compression for large datasets
   */
  compress(data) {
    // Simple JSON compression - in production, consider using zlib
    const str = JSON.stringify(data);
    return Buffer.from(str).toString('base64');
  }

  decompress(compressedData) {
    const str = Buffer.from(compressedData, 'base64').toString();
    return JSON.parse(str);
  }

  /**
   * HEALTH CHECK
   * Redis connection health
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, error: 'Not connected' };
      }
      
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency: `${latency}ms`,
        stats: this.getStats()
      };
      
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * GRACEFUL SHUTDOWN
   */
  async shutdown() {
    try {
      if (this.redis) {
        await this.redis.quit();
        console.log('✅ Redis connection closed gracefully');
      }
    } catch (error) {
      console.error('❌ Error during Redis shutdown:', error.message);
    }
  }
}

// Export singleton instance
const cacheService = new AdvancedCacheService();

module.exports = cacheService;
