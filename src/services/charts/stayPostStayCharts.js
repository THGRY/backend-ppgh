// OPTIMIZED Stay & Post-Stay Charts - Fast queries like 5-metrics API
const l1Service = require('../l1MetricsService');

// Helper function to get initialized prisma instance
async function getPrisma() {
  await l1Service.initializePrisma();
  return l1Service.prisma;
}

/**
 * STAY & POST-STAY CHARTS SERVICE
 * 
 * This service handles chart data for the Stay & Post-Stay section:
 * - Chart 5: NPS Scores (Bar Chart)
 * - Chart 6: Re-booking Rates (Line Chart)
 * 
 * Business Logic Focus:
 * - Customer satisfaction tracking
 * - Customer retention and repeat booking analysis
 */

/**
 * OPTIMIZED NPS SCORES - Fast like 5-metrics API
 * Uses simplified quarterly satisfaction tracking
 */
async function getNPSScores(fromDate, toDate) {
  try {
    console.log(`⚡ Getting ULTRA-FAST NPS scores from ${fromDate} to ${toDate}`);
    
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    const prisma = await getPrisma();
    
    // ULTRA-FAST: Single query with 2% sampling, no extended ranges, use _1 fields
    const result = await prisma.$queryRaw`
      SELECT
        DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as quarter,
        YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as year,
        COUNT(DISTINCT td_client_id) * 50 as estimated_customers, -- Scale up from 2% sample
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL 
                              AND booking_transaction_confirmationno_1 != '' 
                              THEN td_client_id END) * 50 as estimated_satisfied
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
      GROUP BY YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)), 
               DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE))
      HAVING COUNT(DISTINCT td_client_id) > 0
      ORDER BY year, quarter
    `;
    
    console.log(`⚡ ULTRA-FAST NPS completed with ${result.length} quarters`);
    
    return {
      data: result.map(row => ({
        period: `Q${row.quarter} ${row.year}`,
        nps_score: row.estimated_customers > 0 
          ? Math.round((row.estimated_satisfied * 100.0) / row.estimated_customers)
          : 0,
        response_count: Number(row.estimated_customers)
      })),
      success: true,
      query_time: new Date().toISOString(),
      note: "Optimized NPS proxy using booking completion rates",
      cached: false
    };
    
  } catch (error) {
    console.error('❌ Error in getNPSScores:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

/**
 * OPTIMIZED RE-BOOKING RATES - Fast like 5-metrics API
 * Simplified customer retention analysis
 */
async function getRebookingRates(fromDate, toDate) {
  try {
    console.log(`⚡ Getting ULTRA-FAST re-booking rates from ${fromDate} to ${toDate}`);
    
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    const prisma = await getPrisma();
    
    // ULTRA-FAST: Single query, 2% sampling, no extended ranges, use _1 fields
    const result = await prisma.$queryRaw`
      WITH customer_bookings AS (
        SELECT
          DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as quarter,
          YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as year,
          td_client_id,
          COUNT(DISTINCT booking_transaction_confirmationno_1) as booking_count
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
          AND booking_transaction_confirmationno_1 IS NOT NULL
          AND booking_transaction_confirmationno_1 != ''
          AND td_client_id IS NOT NULL
          AND td_client_id != ''
        GROUP BY YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)),
                 DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)),
                 td_client_id
        HAVING COUNT(DISTINCT booking_transaction_confirmationno_1) > 0
      )
      SELECT 
        CONCAT('Q', quarter, ' ', year) as period,
        year,
        quarter,
        COUNT(DISTINCT td_client_id) * 50 as estimated_customers, -- Scale up from 2% sample
        COUNT(DISTINCT CASE WHEN booking_count > 1 THEN td_client_id END) * 50 as estimated_repeat_customers,
        CASE 
          WHEN COUNT(DISTINCT td_client_id) > 0 
          THEN ROUND((COUNT(DISTINCT CASE WHEN booking_count > 1 THEN td_client_id END) * 100.0 / COUNT(DISTINCT td_client_id)), 1)
          ELSE 0 
        END as rebooking_rate
      FROM customer_bookings
      GROUP BY year, quarter
      HAVING COUNT(DISTINCT td_client_id) > 0
      ORDER BY year, quarter
    `;
    
    console.log(`⚡ ULTRA-FAST re-booking completed with ${result.length} quarters`);
    
    return {
      data: result.map(row => ({
        period: row.period,
        rebooking_rate: Number(row.rebooking_rate),
        total_guests: Number(row.estimated_customers)
      })),
      success: true,
      query_time: new Date().toISOString(),
      note: "Optimized re-booking analysis using quarterly aggregation",
      cached: false
    };
    
  } catch (error) {
    console.error('❌ Error in getRebookingRates:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

module.exports = {
  getNPSScores,
  getRebookingRates
};
