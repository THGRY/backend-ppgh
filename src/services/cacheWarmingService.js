const smartCacheService = require('./smartCacheService');
const { getL1UniqueVisitors } = require('./l1MetricsService');
const { getUniqueVisitorsByChannel, getLoggedInVsLoggedOut } = require('./charts/awarenessEngagementCharts');

/**
 * CACHE WARMING SERVICE
 * 
 * Pre-populates cache with commonly requested data to ensure
 * fast response times for typical user scenarios
 */

class CacheWarmingService {
  constructor() {
    this.isWarming = false;
    this.lastWarmTime = null;
    this.warmingStats = {
      totalQueries: 0,
      successCount: 0,
      errorCount: 0,
      averageTime: 0
    };
  }

  /**
   * Get common date ranges that users typically request
   */
  getCommonDateRanges() {
    const now = new Date();
    
    // Helper function to format dates
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    return [
      // Last 7 days
      {
        name: 'last_7_days',
        fromDate: formatDate(new Date(now - 7 * 24 * 60 * 60 * 1000)),
        toDate: formatDate(now)
      },
      // Last 30 days
      {
        name: 'last_30_days', 
        fromDate: formatDate(new Date(now - 30 * 24 * 60 * 60 * 1000)),
        toDate: formatDate(now)
      },
      // Current month
      {
        name: 'current_month',
        fromDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
        toDate: formatDate(now)
      },
      // Previous month
      {
        name: 'previous_month',
        fromDate: formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        toDate: formatDate(new Date(now.getFullYear(), now.getMonth(), 0))
      },
      // Last quarter
      {
        name: 'last_quarter',
        fromDate: formatDate(new Date(now.getFullYear(), now.getMonth() - 3, 1)),
        toDate: formatDate(now)
      }
    ];
  }

  /**
   * Define queries to warm up
   */
  getWarmingQueries() {
    const dateRanges = this.getCommonDateRanges();
    const queries = [];

    // For each date range, add all the key metrics and charts
    dateRanges.forEach(range => {
      // Metrics queries
      queries.push({
        name: `unique_visitors_${range.name}`,
        layer: 'metrics',
        endpoint: 'unique_visitors',
        params: range,
        fallbackFunction: () => getL1UniqueVisitors(range.fromDate, range.toDate)
      });

      // Chart queries
      queries.push({
        name: `visitors_by_channel_${range.name}`,
        layer: 'charts',
        endpoint: 'unique_visitors_by_channel',
        params: range,
        fallbackFunction: () => getUniqueVisitorsByChannel(range.fromDate, range.toDate)
      });

      queries.push({
        name: `login_status_${range.name}`,
        layer: 'charts', 
        endpoint: 'logged_in_vs_out',
        params: range,
        fallbackFunction: () => getLoggedInVsLoggedOut(range.fromDate, range.toDate)
      });
    });

    return queries;
  }

  /**
   * Warm cache with common queries
   */
  async warmCache() {
    if (this.isWarming) {
      console.log('🔥 Cache warming already in progress...');
      return;
    }

    this.isWarming = true;
    const startTime = Date.now();
    
    console.log('🔥 Starting cache warming process...');
    
    try {
      const queries = this.getWarmingQueries();
      this.warmingStats.totalQueries = queries.length;
      this.warmingStats.successCount = 0;
      this.warmingStats.errorCount = 0;

      console.log(`📊 Warming ${queries.length} common queries...`);

      // Process queries in small batches to avoid overwhelming the database
      const batchSize = 2; // Reduced from 3 to 2
      for (let i = 0; i < queries.length; i += batchSize) {
        const batch = queries.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (query) => {
          try {
            console.log(`🔥 Warming: ${query.name}`);
            
            await smartCacheService.smartCacheWithFallback(
              query.layer,
              query.endpoint,
              query.params.fromDate,
              query.params.toDate,
              query.fallbackFunction
            );
            
            this.warmingStats.successCount++;
            console.log(`✅ Warmed: ${query.name}`);
            
          } catch (error) {
            this.warmingStats.errorCount++;
            console.error(`❌ Failed to warm ${query.name}:`, error.message);
          }
        }));

        // Optimized delay between batches
        if (i + batchSize < queries.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced to 1s for better performance
        }
      }

      const duration = Date.now() - startTime;
      this.warmingStats.averageTime = duration / queries.length;
      this.lastWarmTime = new Date().toISOString();

      console.log('🔥 Cache warming completed:');
      console.log(`   ✅ Success: ${this.warmingStats.successCount}/${this.warmingStats.totalQueries}`);
      console.log(`   ❌ Errors: ${this.warmingStats.errorCount}`);
      console.log(`   ⏱️ Total time: ${duration}ms`);
      console.log(`   📊 Average per query: ${this.warmingStats.averageTime.toFixed(0)}ms`);

    } catch (error) {
      console.error('❌ Cache warming process failed:', error);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Schedule automatic cache warming
   */
  scheduleWarming() {
    // Warm cache immediately on startup (after a delay)
    setTimeout(() => {
      this.warmCache();
    }, 10000); // 10 seconds after startup

    // Then warm cache every 6 hours
    setInterval(() => {
      this.warmCache();
    }, 6 * 60 * 60 * 1000); // 6 hours

    console.log('📅 Cache warming scheduled: startup + every 6 hours');
  }

  /**
   * Get warming statistics
   */
  getStats() {
    return {
      isWarming: this.isWarming,
      lastWarmTime: this.lastWarmTime,
      stats: this.warmingStats,
      nextWarmTime: this.lastWarmTime ? 
        new Date(new Date(this.lastWarmTime).getTime() + 6 * 60 * 60 * 1000).toISOString() :
        'Not scheduled'
    };
  }

  /**
   * Invalidate and rewarm specific patterns
   */
  async invalidateAndWarm(pattern) {
    console.log(`🗑️ Invalidating cache pattern: ${pattern}`);
    
    await cacheService.invalidatePattern(pattern);
    
    // Re-warm the affected queries
    const queries = this.getWarmingQueries().filter(q => 
      cacheService.generateKey(q.layer, q.endpoint, q.params).includes(pattern.replace('*', ''))
    );

    if (queries.length > 0) {
      console.log(`🔥 Re-warming ${queries.length} affected queries...`);
      await this.warmCache();
    }
  }
}

// Export singleton instance
const cacheWarmingService = new CacheWarmingService();

module.exports = cacheWarmingService;
