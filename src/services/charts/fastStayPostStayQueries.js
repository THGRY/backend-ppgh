/**
 * ULTRA-FAST STAY & POST-STAY QUERIES
 * 
 * Emergency fallback queries for when standard queries are too slow
 * These sacrifice some accuracy for extreme speed (sub-second responses)
 */

const l1Service = require('../l1MetricsService');

// Helper function to get initialized prisma instance
async function getPrisma() {
  await l1Service.initializePrisma();
  return l1Service.prisma;
}

/**
 * ULTRA-FAST NPS PROXY (Emergency Fallback)
 * Uses minimal sampling and simplified logic for <1s response
 */
async function getFastNPSScores(fromDate, toDate) {
  try {
    console.log(`⚡ Getting ULTRA-FAST NPS scores from ${fromDate} to ${toDate}`);
    
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    // Only analyze requested date range (no historical extension)
    const prisma = await getPrisma();
    const result = await prisma.$queryRaw`
      WITH fast_metrics AS (
        SELECT
          DATEPART(QUARTER, DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')) as quarter,
          YEAR(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')) as year,
          COUNT(DISTINCT td_client_id) * 200 as estimated_customers, -- Scale up from 0.5% sample
          COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno IS NOT NULL THEN td_client_id END) * 200 as estimated_satisfied
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (0.5 PERCENT) WITH (INDEX(idx_pageviews_part_time))
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
          AND td_client_id IS NOT NULL
        GROUP BY 
          DATEPART(QUARTER, DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')),
          YEAR(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01'))
        HAVING COUNT(DISTINCT td_client_id) > 0
      )
      SELECT
        CONCAT('Q', quarter, ' ', year) as period,
        CASE 
          WHEN estimated_customers > 0 
          THEN ROUND((estimated_satisfied * 100.0 / estimated_customers), 0)
          ELSE 50 -- Default neutral score
        END as nps_score,
        estimated_customers as response_count,
        year,
        quarter
      FROM fast_metrics
      ORDER BY year, quarter
    `;
    
    console.log(`⚡ ULTRA-FAST NPS completed with ${result.length} quarters`);
    
    return {
      data: result.map(row => ({
        period: row.period,
        nps_score: Number(row.nps_score),
        response_count: Number(row.response_count)
      })),
      success: true,
      query_time: new Date().toISOString(),
      note: "Ultra-fast NPS proxy using minimal sampling",
      cached: false,
      optimization: "emergency_fast_mode"
    };
    
  } catch (error) {
    console.error('❌ Error in getFastNPSScores:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

/**
 * ULTRA-FAST RE-BOOKING RATES (Emergency Fallback)
 * Uses minimal sampling and simplified logic for <1s response
 */
async function getFastRebookingRates(fromDate, toDate) {
  try {
    console.log(`⚡ Getting ULTRA-FAST re-booking rates from ${fromDate} to ${toDate}`);
    
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    // Simplified analysis - only current quarter
    const prisma = await getPrisma();
    const result = await prisma.$queryRaw`
      WITH fast_booking_analysis AS (
        SELECT
          DATEPART(QUARTER, DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')) as quarter,
          YEAR(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')) as year,
          td_client_id,
          COUNT(DISTINCT booking_transaction_confirmationno) as booking_count
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (0.5 PERCENT) WITH (INDEX(idx_pageviews_part_time))
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
          AND booking_transaction_confirmationno IS NOT NULL
          AND td_client_id IS NOT NULL
        GROUP BY 
          DATEPART(QUARTER, DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')),
          YEAR(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')),
          td_client_id
        HAVING COUNT(DISTINCT booking_transaction_confirmationno) > 0
      ),
      fast_summary AS (
        SELECT 
          year,
          quarter,
          COUNT(DISTINCT td_client_id) * 200 as estimated_customers, -- Scale up from 0.5% sample
          COUNT(DISTINCT CASE WHEN booking_count > 1 THEN td_client_id END) * 200 as estimated_repeat_customers
        FROM fast_booking_analysis
        GROUP BY year, quarter
      )
      SELECT
        CONCAT('Q', quarter, ' ', year) as period,
        CASE 
          WHEN estimated_customers > 0 
          THEN ROUND((estimated_repeat_customers * 100.0 / estimated_customers), 1)
          ELSE 15.0 -- Default industry average
        END as rebooking_rate,
        estimated_customers as total_guests,
        year,
        quarter
      FROM fast_summary
      ORDER BY year, quarter
    `;
    
    console.log(`⚡ ULTRA-FAST re-booking completed with ${result.length} quarters`);
    
    return {
      data: result.map(row => ({
        period: row.period,
        rebooking_rate: Number(row.rebooking_rate),
        total_guests: Number(row.total_guests)
      })),
      success: true,
      query_time: new Date().toISOString(),
      note: "Ultra-fast re-booking analysis using minimal sampling",
      cached: false,
      optimization: "emergency_fast_mode"
    };
    
  } catch (error) {
    console.error('❌ Error in getFastRebookingRates:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

module.exports = {
  getFastNPSScores,
  getFastRebookingRates
};
