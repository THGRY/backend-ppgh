// OPTIMIZED Conversion Charts - Fast queries like 5-metrics API
const l1Service = require('./src/services/l1MetricsService');

// Helper function to get initialized prisma instance
async function getPrisma() {
  await l1Service.initializePrisma();
  return l1Service.prisma;
}

/**
 * OPTIMIZED CHART 3: BOOKING FUNNEL (Funnel Chart)
 * - Target: <1000ms response time
 * - Uses 2% sampling with scaling for accuracy
 * - Single aggregation query (no CTEs)
 */
async function getBookingFunnel(fromDate, toDate) {
  try {
    console.log(`🚀 Getting OPTIMIZED booking funnel from ${fromDate} to ${toDate}`);
    
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    const prisma = await getPrisma();
    const result = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT td_client_id) as total_visitors,
        COUNT(DISTINCT CASE WHEN booking_bookingwidget_arrivaldate_1 IS NOT NULL 
                             AND booking_bookingwidget_arrivaldate_1 != '' 
                             THEN td_client_id END) as search_users,
        COUNT(DISTINCT CASE WHEN booking_bookingwidget_adultroom_1 IS NOT NULL 
                             AND booking_bookingwidget_adultroom_1 != '' 
                             THEN td_client_id END) as selection_users,
        COUNT(DISTINCT CASE WHEN booking_transaction_totalpayment_1 IS NOT NULL 
                             AND booking_transaction_totalpayment_1 != '' 
                             AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0 
                             THEN td_client_id END) as payment_users,
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL 
                             AND booking_transaction_confirmationno_1 != '' 
                             THEN td_client_id END) as confirmed_users
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
    `;
    
    const data = result[0];
    const scaleFactor = 50; // Scale up from 2% sample
    
    const totalVisitors = Number(data.total_visitors) * scaleFactor;
    const searchUsers = Number(data.search_users) * scaleFactor;
    const selectionUsers = Number(data.selection_users) * scaleFactor;
    const paymentUsers = Number(data.payment_users) * scaleFactor;
    const confirmedUsers = Number(data.confirmed_users) * scaleFactor;
    
    const funnelStages = [
      {
        stage: 'Page Views',
        count: totalVisitors,
        percentage: 100.0
      },
      {
        stage: 'Room Search',
        count: searchUsers,
        percentage: totalVisitors > 0 ? Math.round((searchUsers / totalVisitors) * 100 * 10) / 10 : 0
      },
      {
        stage: 'Room Selection',
        count: selectionUsers,
        percentage: totalVisitors > 0 ? Math.round((selectionUsers / totalVisitors) * 100 * 10) / 10 : 0
      },
      {
        stage: 'Booking Form',
        count: paymentUsers,
        percentage: totalVisitors > 0 ? Math.round((paymentUsers / totalVisitors) * 100 * 10) / 10 : 0
      },
      {
        stage: 'Confirmation',
        count: confirmedUsers,
        percentage: totalVisitors > 0 ? Math.round((confirmedUsers / totalVisitors) * 100 * 10) / 10 : 0
      }
    ];
    
    console.log(`✅ Booking funnel analysis completed with 5 stages`);
    
    return {
      data: funnelStages,
      success: true,
      query_time: new Date().toISOString(),
      cached: false
    };
    
  } catch (error) {
    console.error('❌ Error in getBookingFunnel:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

/**
 * OPTIMIZED CHART 4: BOOKING REVENUE TRENDS (Line Chart)
 * - Target: <1000ms response time
 * - Simplified: Current period only (no extended range)
 * - No currency conversion for speed
 * - Uses 2% sampling
 */
async function getBookingRevenueTrends(fromDate, toDate) {
  try {
    console.log(`🚀 Getting OPTIMIZED revenue trends from ${fromDate} to ${toDate}`);
    
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    const prisma = await getPrisma();
    const result = await prisma.$queryRaw`
      SELECT
        YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as year,
        MONTH(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as month,
        SUM(TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT)) as revenue,
        COUNT(DISTINCT booking_transaction_confirmationno_1) as bookings
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND booking_transaction_confirmationno_1 IS NOT NULL
        AND booking_transaction_totalpayment_1 IS NOT NULL
        AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0
      GROUP BY YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)),
               MONTH(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE))
      ORDER BY year, month
    `;
    
    const scaleFactor = 50; // Scale up from 2% sample
    
    const monthNames = {
      1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'May', 6: 'Jun',
      7: 'Jul', 8: 'Aug', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
    };
    
    const trendData = result.map(row => ({
      month: `${monthNames[Number(row.month)]} ${row.year}`,
      revenue: Math.round(Number(row.revenue || 0) * scaleFactor),
      bookings: Math.round(Number(row.bookings || 0) * scaleFactor)
    }));
    
    console.log(`✅ Revenue trends analysis completed with ${trendData.length} data points`);
    
    return {
      data: trendData,
      success: true,
      query_time: new Date().toISOString(),
      cached: false
    };
    
  } catch (error) {
    console.error('❌ Error in getBookingRevenueTrends:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

module.exports = {
  getBookingFunnel,
  getBookingRevenueTrends
};
