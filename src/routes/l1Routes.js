const express = require('express');
const { 
  getL1UniqueVisitors, 
  getL1TotalBookings, 
  getL1RoomNights, 
  getL1TotalRevenue, 
  getL1ABV 
} = require('../services/l1MetricsService');

// Import unlimited rate limiter configuration
const { createRateLimiter } = require('../middleware/rateLimiter');

// Import chart services
const {
  getL1AwarenessEngagementData,
  getL1ConversionsData,
  getL1StayPostStayData
} = require('../services/l1ChartsService');

const router = express.Router();

/**
 * Validate date parameters
 */
function validateDateParams(req, res, next) {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters',
      message: 'Both "from" and "to" date parameters are required',
      example: '/api/l1-summary-data?from=2025-07-01&to=2025-07-07'
    });
  }
  
  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date format',
      message: 'Dates must be in YYYY-MM-DD format',
      example: 'from=2025-07-01&to=2025-07-07'
    });
  }
  
  // Check if dates are valid
  const fromDate = new Date(from);
  const toDate = new Date(to);
  
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid dates',
      message: 'Please provide valid dates'
    });
  }
  
  if (fromDate > toDate) {
    return res.status(400).json({
      success: false,
      error: 'Invalid date range',
      message: '"from" date must be before or equal to "to" date'
    });
  }
  
  // UNLIMITED DATE RANGE: Allow any date range for analytics flexibility
  const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24));
  
  // Log large queries for monitoring (but don't block them)
  if (daysDiff > 365) {
    console.log(`📊 Large date range requested: ${daysDiff} days (${from} to ${to})`);
  }
  
  // Optional: Add warning header for very large ranges
  if (daysDiff > 1000) {
    res.set('X-Large-Query-Warning', `Query spans ${daysDiff} days - may take longer`);
  }
  
  next();
}

/**
 * GET /api/l1-summary-data
 * Returns key metrics (Unique Visitors + Total Bookings)
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-summary-data', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    console.log(`🔍 API Request: L1 Summary Data for ${from} to ${to}`);
    
    // Get all 5 key metrics in parallel for maximum performance
    const [
      uniqueVisitorsResult, 
      totalBookingsResult, 
      roomNightsResult, 
      totalRevenueResult, 
      abvResult
    ] = await Promise.all([
      getL1UniqueVisitors(from, to),
      getL1TotalBookings(from, to),
      getL1RoomNights(from, to),
      getL1TotalRevenue(from, to),
      getL1ABV(from, to)
    ]);
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    // Check if all queries succeeded - handle null results from cache misses
    const results = [uniqueVisitorsResult, totalBookingsResult, roomNightsResult, totalRevenueResult, abvResult].filter(result => result !== null);
    const failedResults = results.filter(result => result && !result.success);
    
    if (failedResults.length > 0) {
      return res.status(500).json({
        success: false,
        error: 'One or more database queries failed',
        failed_metrics: failedResults.map(result => result.error)
      });
    }
    
    // Return complete L1 key metrics in Laravel-compatible format
    res.json({
      success: true,
      result: {
        key_metrics: {
          unique_visitors: uniqueVisitorsResult.unique_visitors,
          total_bookings: totalBookingsResult.total_bookings,
          room_nights: roomNightsResult.room_nights,
          total_revenue: totalRevenueResult.total_revenue,
          abv: abvResult.abv
        },
        data_source: "REAL DATABASE DATA - Azure MSSQL pppythia",
        date_range: `${from} to ${to}`,
        query_performance: {
          response_time_ms: responseTime,
          metrics_count: 5,
          parallel_execution: true
        }
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - All 5 metrics completed successfully`);
    
  } catch (error) {
    console.error('❌ API Error in l1-summary-data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-unique-visitors
 * Returns only unique visitors metric
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-unique-visitors', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    console.log(`🔍 API Request: L1 Unique Visitors for ${from} to ${to}`);
    
    const result = await getL1UniqueVisitors(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      result: {
        metric: 'unique_visitors',
        value: result.unique_visitors,
        date_range: `${from} to ${to}`,
        query_time_ms: responseTime
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Unique Visitors: ${result.unique_visitors}`);
    
  } catch (error) {
    console.error('❌ API Error in l1-unique-visitors:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-total-bookings
 * Returns only total bookings metric
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-total-bookings', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    console.log(`🔍 API Request: L1 Total Bookings for ${from} to ${to}`);
    
    const result = await getL1TotalBookings(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      result: {
        metric: 'total_bookings',
        value: result.total_bookings,
        date_range: `${from} to ${to}`,
        query_time_ms: responseTime
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Total Bookings: ${result.total_bookings}`);
    
  } catch (error) {
    console.error('❌ API Error in l1-total-bookings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-room-nights
 * Returns only room nights metric
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-room-nights', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    console.log(`🔍 API Request: L1 Room Nights for ${from} to ${to}`);
    
    const result = await getL1RoomNights(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      result: {
        metric: 'room_nights',
        value: result.room_nights,
        date_range: `${from} to ${to}`,
        query_time_ms: responseTime
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Room Nights: ${result.room_nights}`);
    
  } catch (error) {
    console.error('❌ API Error in l1-room-nights:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-total-revenue
 * Returns only total revenue metric
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-total-revenue', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    console.log(`🔍 API Request: L1 Total Revenue for ${from} to ${to}`);
    
    const result = await getL1TotalRevenue(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      result: {
        metric: 'total_revenue',
        value: result.total_revenue,
        currency: 'USD',
        date_range: `${from} to ${to}`,
        query_time_ms: responseTime
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Total Revenue: $${result.total_revenue.toLocaleString()}`);
    
  } catch (error) {
    console.error('❌ API Error in l1-total-revenue:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-abv
 * Returns only average booking value metric
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-abv', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    console.log(`🔍 API Request: L1 ABV for ${from} to ${to}`);
    
    const result = await getL1ABV(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Database query failed',
        message: result.error
      });
    }
    
    res.json({
      success: true,
      result: {
        metric: 'abv',
        value: result.abv,
        currency: 'USD',
        date_range: `${from} to ${to}`,
        calculation_details: result.calculation_details,
        query_time_ms: responseTime
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - ABV: $${result.abv}`);
    
  } catch (error) {
    console.error('❌ API Error in l1-abv:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-awareness-engagement
 * Returns awareness & engagement charts data
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-awareness-engagement', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    // Set timeout headers for long-running analytics queries
    res.setTimeout(300000); // 5 minutes timeout
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    console.log(`🔍 API Request: L1 Awareness & Engagement for ${from} to ${to}`);
    
    const result = await getL1AwarenessEngagementData(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Chart data query failed',
        message: result.error,
        details: result.details
      });
    }
    
    res.json({
      success: true,
      result: {
        ...result.result,
        query_performance: {
          response_time_ms: responseTime,
          charts_loaded: 2
        }
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Awareness & Engagement charts loaded`);
    
  } catch (error) {
    console.error('❌ API Error in l1-awareness-engagement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-conversions
 * Returns conversion charts data
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-conversions', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    // Set timeout headers for long-running analytics queries
    res.setTimeout(300000); // 5 minutes timeout
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    console.log(`🔍 API Request: L1 Conversions for ${from} to ${to}`);
    
    const result = await getL1ConversionsData(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Chart data query failed',
        message: result.error,
        details: result.details
      });
    }
    
    res.json({
      success: true,
      result: {
        ...result.result,
        query_performance: {
          response_time_ms: responseTime,
          charts_loaded: 2
        }
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Conversions charts loaded`);
    
  } catch (error) {
    console.error('❌ API Error in l1-conversions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-stay-poststay
 * Returns stay & post-stay charts data
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD
 */
router.get('/l1-stay-poststay', validateDateParams, async (req, res) => {
  try {
    const { from, to } = req.query;
    const startTime = Date.now();
    
    // Set timeout headers for long-running analytics queries
    res.setTimeout(300000); // 5 minutes timeout (this endpoint is the slowest)
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    console.log(`🔍 API Request: L1 Stay & Post-Stay for ${from} to ${to}`);
    
    const result = await getL1StayPostStayData(from, to);
    const responseTime = Date.now() - startTime;
    
    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Chart data query failed',
        message: result.error,
        details: result.details
      });
    }
    
    res.json({
      success: true,
      result: {
        ...result.result,
        query_performance: {
          response_time_ms: responseTime,
          charts_loaded: 2
        }
      }
    });
    
    console.log(`✅ API Response: ${responseTime}ms - Stay & Post-Stay charts loaded`);
    
  } catch (error) {
    console.error('❌ API Error in l1-stay-poststay:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * GET /api/l1-date-ranges
 * Helper endpoint to get available date ranges in the database
 */
router.get('/l1-date-ranges', async (req, res) => {
  try {
    // Use the shared prisma instance from l1MetricsService
    const l1Service = require('../services/l1MetricsService');
    await l1Service.initializePrisma(); // Ensure Prisma is initialized
    const prisma = l1Service.prisma;
    
    // Get date range of available data
    const dateRange = await prisma.$queryRaw`
      SELECT 
        MIN(time) as min_time,
        MAX(time) as max_time,
        COUNT(*) as total_records
      FROM preprocessed.pageviews_partitioned 
      WHERE time IS NOT NULL
    `;
    
    await prisma.$disconnect();
    
    if (dateRange[0].min_time && dateRange[0].max_time) {
      const minDate = new Date(Number(dateRange[0].min_time) * 1000);
      const maxDate = new Date(Number(dateRange[0].max_time) * 1000);
      
      res.json({
        success: true,
        result: {
          available_date_range: {
            from: minDate.toISOString().split('T')[0],
            to: maxDate.toISOString().split('T')[0]
          },
          total_records: Number(dateRange[0].total_records),
          suggested_test_ranges: [
            { from: '2025-07-01', to: '2025-07-07', description: 'Recent week' },
            { from: '2025-06-01', to: '2025-06-30', description: 'Full month' },
            { from: '2024-12-01', to: '2024-12-31', description: 'Different month' },
            { from: '2025-01-01', to: '2025-01-31', description: 'January 2025' }
          ]
        }
      });
    } else {
      res.json({
        success: false,
        error: 'No data found in database'
      });
    }
    
  } catch (error) {
    console.error('❌ API Error in l1-date-ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
