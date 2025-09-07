const { PrismaClient } = require('@prisma/client');
const cacheService = require('./advancedCacheService');
const smartCacheService = require('./smartCacheService');
const logger = require('../utils/logger');

// Initialize Prisma client with CONNECTION POOLING for optimal analytics performance
let prisma;
let isInitialized = false;

// Async initialization function
async function initializePrisma() {
  if (isInitialized) return prisma;
  
  try {
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      errorFormat: 'pretty',
      // Connection pooling configuration optimized for analytics workloads
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      // Performance optimizations for heavy analytical queries
      transactionOptions: {
        timeout: 45000, // 45 seconds for complex analytical queries
        maxWait: 10000,  // 10 seconds max wait for connection
      },
      // Enhanced connection pooling for Azure SQL Server
      // Note: Connection pool settings are configured in DATABASE_URL
      // to avoid conflicts between Prisma config and connection string
    });
    
    // Enable graceful shutdown for connection pooling
    const gracefulShutdown = async () => {
          logger.info('Gracefully disconnecting Prisma client...');
    try {
      await prisma.$disconnect();
      logger.success('Prisma client disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting Prisma client:', error);
    }
    };

    // Handle different shutdown signals
    process.on('beforeExit', gracefulShutdown);
    process.on('SIGINT', async () => {
      await gracefulShutdown();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await gracefulShutdown();
      process.exit(0);
    });
    
    // Test connection and implement retry logic
    await testDatabaseConnection();
    
    logger.success('Prisma client initialized with optimized connection pooling for analytics workloads');
    logger.info('Shared connection pool will be used across all chart services');
    logger.debug('Connection Pool Settings: Max Connections: 20, Pool Timeout: 45s, Query Timeout: 120s');
    
    isInitialized = true;
    return prisma;
    
  } catch (error) {
    logger.error('Failed to initialize Prisma client:', error);
    throw error;
  }
}

// Initialize immediately but don't await (will be awaited on first use)
const prismaPromise = initializePrisma();

// Synchronous prisma getter that ensures initialization
function getPrisma() {
  if (!isInitialized) {
    throw new Error('Prisma client not yet initialized. Call initializePrisma() first.');
  }
  return prisma;
}

/**
 * CONNECTION HEALTH TESTING AND RETRY LOGIC
 * Tests database connection with retry mechanism for Azure SQL Server
 */
async function testDatabaseConnection(retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔍 Testing database connection (attempt ${attempt}/${retries})...`);
      
      // Simple connection test query
      await prisma.$queryRaw`SELECT 1 as test`;
      
      console.log('✅ Database connection successful');
      return true;
      
    } catch (error) {
      console.error(`❌ Connection attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        console.error('🚨 All connection attempts failed');
        throw new Error(`Database connection failed after ${retries} attempts: ${error.message}`);
      }
      
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * CONNECTION HEALTH CHECK FUNCTION
 * Can be called periodically to ensure connection is alive
 */
async function checkConnectionHealth() {
  try {
    // Ensure Prisma is initialized
    await prismaPromise;
    
    // Check database health
    await prisma.$queryRaw`SELECT 1 as health_check`;
    
    // Check cache health
    const cacheHealth = await cacheService.healthCheck();
    
    return { 
      database: { healthy: true, timestamp: new Date().toISOString() },
      cache: cacheHealth,
      overall: { healthy: true, timestamp: new Date().toISOString() }
    };
  } catch (error) {
    console.error('❌ Connection health check failed:', error);
    
    // Still check cache even if database fails
    const cacheHealth = await cacheService.healthCheck();
    
    return { 
      database: { healthy: false, error: error.message, timestamp: new Date().toISOString() },
      cache: cacheHealth,
      overall: { healthy: false, error: error.message, timestamp: new Date().toISOString() }
    };
  }
}

/**
 * L1 Metrics Service - Fast Prisma implementation using raw SQL
 * Replaces slow Laravel backend with optimized SQL queries through Prisma
 * Note: Using raw SQL because pageviews table has no unique identifier
 */

/**
 * METRIC 1: UNIQUE VISITORS
 * Business Logic: Total distinct website visitors in date range
 * Database Logic: COUNT(DISTINCT td_client_id) 
 * Performance: Date filtering + null handling
 */
async function getL1UniqueVisitors(fromDate, toDate) {
  // DIRECT DATABASE QUERY (Caching disabled for reliability)
  try {
        // Ensure Prisma is initialized
        await prismaPromise;
        
        logger.query(`Getting unique visitors from ${fromDate} to ${toDate}`);
        
        // Convert dates to Unix timestamps (database uses BigInt timestamps)
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
        const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
        
        // Use raw SQL query since pageviews table is ignored by Prisma
        const result = await prisma.$queryRaw`
          SELECT COUNT(DISTINCT td_client_id) as unique_visitors
          FROM preprocessed.pageviews_partitioned
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
            AND td_client_id IS NOT NULL
            AND td_client_id != ''
        `;
        
        const uniqueVisitors = Number(result[0].unique_visitors);
        
        logger.success(`Found ${uniqueVisitors} unique visitors`);
        
        return {
          unique_visitors: uniqueVisitors,
          success: true,
          query_time: new Date().toISOString(),
          cached: false
        };
        
  } catch (error) {
    logger.error('Error in getL1UniqueVisitors:', error);
    return {
      unique_visitors: 0,
      success: false,
      error: error.message,
      cached: false
    };
  }
}

/**
 * METRIC 2: TOTAL BOOKINGS
 * Business Logic: Total completed bookings with confirmation numbers
 * Database Logic: COUNT(DISTINCT confirmation_no) from UNION of both confirmation columns
 * Performance: Date filtering + non-null confirmations
 */
async function getL1TotalBookings(fromDate, toDate) {
  // SMART CACHING: Intelligent date-range caching with chunk aggregation
  return await smartCacheService.smartCacheWithFallback(
    'metrics',
    'total_bookings',
    fromDate,
    toDate,
    async () => {
      try {
        console.log(`🔍 Getting total bookings from ${fromDate} to ${toDate}`);
    
    // Convert dates to Unix timestamps
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    // Use raw SQL query to get unique bookings from both confirmation columns
    const result = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT confirmation_no) as total_bookings
      FROM (
          SELECT booking_transaction_confirmationno as confirmation_no
          FROM preprocessed.pageviews_partitioned
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
            AND booking_transaction_confirmationno IS NOT NULL
            AND booking_transaction_confirmationno != ''

          UNION

          SELECT booking_transaction_confirmationno_1 as confirmation_no
          FROM preprocessed.pageviews_partitioned
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
            AND booking_transaction_confirmationno_1 IS NOT NULL
            AND booking_transaction_confirmationno_1 != ''
      ) as all_confirmations
    `;
    
    const totalBookings = Number(result[0].total_bookings);
    
    console.log(`✅ Found ${totalBookings} total bookings`);
    
        return {
          total_bookings: totalBookings,
          success: true,
          query_time: new Date().toISOString(),
          cached: false
        };
        
      } catch (error) {
        console.error('❌ Error in getL1TotalBookings:', error);
        return {
          total_bookings: 0,
          success: false,
          error: error.message,
          cached: false
        };
      }
    }
  );
}

/**
 * METRIC 3: ROOM NIGHTS
 * Business Logic: Total hotel room nights booked in date range
 * Database Logic: SUM(TRY_CAST(nights AS FLOAT)) from both night columns
 * Performance: Date filtering + null handling + TRY_CAST for nvarchar to float
 */
async function getL1RoomNights(fromDate, toDate) {
  // SMART CACHING: Intelligent date-range caching with chunk aggregation
  return await smartCacheService.smartCacheWithFallback(
    'metrics',
    'room_nights',
    fromDate,
    toDate,
    async () => {
      try {
        console.log(`🔍 Getting room nights from ${fromDate} to ${toDate}`);
    
    // Convert dates to Unix timestamps
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    // Use raw SQL query to sum room nights from both columns
    const result = await prisma.$queryRaw`
      SELECT
        SUM(
          ISNULL(TRY_CAST(booking_bookingwidget_totalnightstay AS FLOAT), 0) +
          ISNULL(TRY_CAST(booking_bookingwidget_totalnightstay_1 AS FLOAT), 0)
        ) as room_nights
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND (
          booking_bookingwidget_totalnightstay IS NOT NULL OR
          booking_bookingwidget_totalnightstay_1 IS NOT NULL
        )
    `;
    
    const roomNights = Number(result[0].room_nights) || 0;
    
    console.log(`✅ Found ${roomNights} room nights`);
    
        return {
          room_nights: roomNights,
          success: true,
          query_time: new Date().toISOString(),
          cached: false
        };
        
      } catch (error) {
        console.error('❌ Error in getL1RoomNights:', error);
        return {
          room_nights: 0,
          success: false,
          error: error.message,
          cached: false
        };
      }
    }
  );
}

/**
 * METRIC 4: TOTAL REVENUE (USD)
 * Business Logic: Total booking revenue converted to USD with multi-currency support
 * Database Logic: SUM(payment * exchange_rate) with currency conversion
 * Complexity: HIGH - Multi-currency with exchange rate lookup from pythia_db.currencies
 */
async function getL1TotalRevenue(fromDate, toDate) {
  // SMART CACHING: Intelligent date-range caching with chunk aggregation
  return await smartCacheService.smartCacheWithFallback(
    'metrics',
    'total_revenue',
    fromDate,
    toDate,
    async () => {
      try {
        console.log(`🔍 Getting total revenue from ${fromDate} to ${toDate}`);
    
    // Convert dates to Unix timestamps
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    // Complex multi-currency revenue calculation with exchange rates
    const result = await prisma.$queryRaw`
      WITH payment_data AS (
        SELECT
          TRY_CAST(booking_transaction_totalpayment AS FLOAT) as payment_amount,
          booking_transaction_currencytype as currency_code
        FROM preprocessed.pageviews_partitioned
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
          AND booking_transaction_totalpayment IS NOT NULL
          AND booking_transaction_totalpayment != ''
          AND TRY_CAST(booking_transaction_totalpayment AS FLOAT) > 0

        UNION ALL

        SELECT
          TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) as payment_amount,
          booking_transaction_currencytype_1 as currency_code
        FROM preprocessed.pageviews_partitioned
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
          AND booking_transaction_totalpayment_1 IS NOT NULL
          AND booking_transaction_totalpayment_1 != ''
          AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0
      )
      SELECT
        SUM(
          payment_data.payment_amount *
          CASE
            WHEN UPPER(payment_data.currency_code) = 'USD' THEN 1.0
            ELSE COALESCE(c.exchange_rate_to_usd, 1.0)
          END
        ) as total_revenue_usd
      FROM payment_data
      LEFT JOIN pythia_db.currencies c ON UPPER(c.code) = UPPER(payment_data.currency_code)
      WHERE payment_data.payment_amount IS NOT NULL
    `;
    
    const totalRevenue = Number(result[0].total_revenue_usd) || 0;
    
    console.log(`✅ Found $${totalRevenue.toLocaleString()} total revenue (USD)`);
    
        return {
          total_revenue: totalRevenue,
          success: true,
          query_time: new Date().toISOString(),
          cached: false
        };
        
      } catch (error) {
        console.error('❌ Error in getL1TotalRevenue:', error);
        return {
          total_revenue: 0,
          success: false,
          error: error.message,
          cached: false
        };
      }
    }
  );
}

/**
 * METRIC 5: AVERAGE BOOKING VALUE (ABV)
 * Business Logic: Revenue per booking (Total Revenue ÷ Total Bookings)
 * Database Logic: Efficient approach using cached results from other functions
 * Performance: Uses results from getL1TotalRevenue and getL1TotalBookings
 */
async function getL1ABV(fromDate, toDate) {
  try {
    console.log(`🔍 Getting ABV from ${fromDate} to ${toDate}`);
    
    // Get revenue and bookings in parallel for efficiency
    const [revenueResult, bookingsResult] = await Promise.all([
      getL1TotalRevenue(fromDate, toDate),
      getL1TotalBookings(fromDate, toDate)
    ]);
    
    if (!revenueResult.success || !bookingsResult.success) {
      throw new Error('Failed to get revenue or bookings data for ABV calculation');
    }
    
    const totalRevenue = revenueResult.total_revenue;
    const totalBookings = bookingsResult.total_bookings;
    
    // Calculate ABV with zero division protection
    const abv = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    
    console.log(`✅ Calculated ABV: $${abv.toFixed(2)} (Revenue: $${totalRevenue.toLocaleString()}, Bookings: ${totalBookings})`);
    
    return {
      abv: Math.round(abv * 100) / 100, // Round to 2 decimal places
      success: true,
      query_time: new Date().toISOString(),
      calculation_details: {
        total_revenue: totalRevenue,
        total_bookings: totalBookings
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getL1ABV:', error);
    return {
      abv: 0,
      success: false,
      error: error.message
    };
  }
}

// Clean up database connections
async function cleanup() {
  await prisma.$disconnect();
}

module.exports = {
  getL1UniqueVisitors,
  getL1TotalBookings,
  getL1RoomNights,
  getL1TotalRevenue,
  getL1ABV,
  cleanup,
  checkConnectionHealth,
  testDatabaseConnection,
  initializePrisma,
  get prisma() {
    // Dynamic getter that ensures initialization
    if (!isInitialized) {
      throw new Error('Prisma not initialized. Ensure initializePrisma() is called first.');
    }
    return prisma;
  }
};
