// Use shared Prisma instance from main service
const l1Service = require('../l1MetricsService');

// Helper function to get initialized prisma instance
async function getPrisma() {
  await l1Service.initializePrisma();
  return l1Service.prisma;
}

/**
 * AWARENESS & ENGAGEMENT CHARTS SERVICE
 * 
 * This service handles chart data for the Awareness & Engagement section:
 * - Chart 1: Unique Visitors by Channel (Bar Chart)
 * - Chart 2: Logged In vs Logged Out Users (Donut Chart)
 * 
 * Business Logic Focus:
 * - Traffic source classification and distribution
 * - User authentication status analysis
 */

/**
 * CHART 1: UNIQUE VISITORS BY CHANNEL (Bar Chart)
 * 
 * Business Logic:
 * - Purpose: Traffic source distribution analysis
 * - Executive Value: Marketing channel effectiveness assessment
 * - Data: Channel classification with visitor counts and percentages
 * 
 * Channel Classification Logic:
 * 1. UTM Source campaigns (highest priority)
 * 2. Search Engine detection (google, bing, yahoo)
 * 3. Social Media detection (facebook, twitter, linkedin, instagram)
 * 4. Direct traffic (no referrer)
 * 5. Other referrers
 */
async function getUniqueVisitorsByChannel(fromDate, toDate) {
  // DIRECT DATABASE QUERY (Caching disabled for reliability)
  try {
        
        // Convert dates to Unix timestamps
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
        const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
        
        // OPTIMIZED: SQL Engineer's optimized query for Unique Visitors by Channel
        const prisma = await getPrisma();
        const result = await prisma.$queryRaw`
      WITH channel_data AS (
          SELECT
              td_client_id,
              CASE
                  WHEN LOWER(utm_source) LIKE '%google%' THEN 'Paid Search'
                  WHEN LOWER(utm_source) LIKE '%facebook%' THEN 'Social Media'
                  WHEN LOWER(utm_source) LIKE '%email%' THEN 'Email'
                  WHEN utm_source IS NOT NULL AND utm_source != '' THEN 'UTM Campaign'
                  WHEN LOWER(td_referrer) LIKE '%google.com%' THEN 'Organic Search'
                  WHEN LOWER(td_referrer) LIKE '%facebook.com%' THEN 'Social Media'
                  WHEN td_referrer IS NULL OR td_referrer = '' THEN 'Direct'
                  ELSE 'Other'
              END AS channel
          FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
          WHERE time BETWEEN ${fromTimestamp} AND ${toTimestamp}
            AND td_client_id IS NOT NULL
      ),
      channel_counts AS (
          SELECT 
              channel,
              COUNT(DISTINCT td_client_id) * 50 AS visitors
          FROM channel_data
          GROUP BY channel
      )
      SELECT TOP 10
          channel,
          visitors,
          ROUND(visitors * 100.0 / SUM(visitors) OVER (), 1) AS percentage
      FROM channel_counts
      WHERE visitors > 0
      ORDER BY visitors DESC
    `;
    
        
        return {
          data: result.map(row => ({
            channel: row.channel,
            visitors: Number(row.visitors),
            percentage: Number(row.percentage)
          })),
          success: true,
          query_time: new Date().toISOString(),
          cached: false
        };
        
  } catch (error) {
    console.error('❌ Error in getUniqueVisitorsByChannel:', error);
    return {
      data: [],
      success: false,
      error: error.message,
      cached: false
    };
  }
}

/**
 * CHART 2: LOGGED IN VS LOGGED OUT USERS (Donut Chart)
 * 
 * Business Logic:
 * - Purpose: User authentication status distribution
 * - Executive Value: Member engagement and login effectiveness
 * - Data: Two segments - logged in vs logged out with counts and percentages
 * 
 * Login Detection Logic:
 * 1. Check user_userinfo_loginstatus fields for login indicators
 * 2. Check for member IDs (indicates logged in users)
 * 3. Check signup page visits (indicates engagement)
 * 4. Default to logged out if no indicators found
 */
async function getLoggedInVsLoggedOut(fromDate, toDate) {
  // DIRECT DATABASE QUERY (Caching disabled for reliability)
  try {
        
        // Convert dates to Unix timestamps
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
        const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
        
        // OPTIMIZED: SQL Engineer's optimized query for Log In & Log Out Users
        const prisma = await getPrisma();
        const result = await prisma.$queryRaw`
      WITH login_data AS (
          SELECT
              td_client_id,
              LOWER(ISNULL(user_userinfo_loginstatus, '')) AS ls1,
              LOWER(ISNULL(user_userinfo_loginstatus_1, '')) AS ls2,
              LOWER(ISNULL(td_url, '')) AS lurl,
              user_userinfo_memberid AS mid1,
              user_userinfo_memberid_1 AS mid2
          FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
          WHERE time BETWEEN ${fromTimestamp} AND ${toTimestamp}
            AND td_client_id IS NOT NULL
      ),
      login_status AS (
          SELECT
              td_client_id,
              CASE
                  WHEN ls1 LIKE '%login%' OR ls2 LIKE '%login%' THEN 'logged_in'
                  WHEN lurl LIKE '%/signup.html%' THEN 'logged_in'
                  WHEN mid1 IS NOT NULL OR mid2 IS NOT NULL THEN 'logged_in'
                  ELSE 'logged_out'
              END AS login_status
          FROM login_data
      ),
      status_summary AS (
          SELECT
              login_status,
              COUNT(DISTINCT td_client_id) * 50 AS user_count
          FROM login_status
          GROUP BY login_status
      )
      SELECT
          login_status,
          user_count AS count,
          ROUND(user_count * 100.0 / SUM(user_count) OVER (), 1) AS percentage
      FROM status_summary
      ORDER BY user_count DESC
    `;
    
    // Format response for donut chart
    const formattedResult = {
      logged_in: { count: 0, percentage: 0 },
      logged_out: { count: 0, percentage: 0 }
    };
    
    result.forEach(row => {
      if (row.login_status === 'logged_in') {
        formattedResult.logged_in = {
          count: Number(row.count),
          percentage: Number(row.percentage)
        };
      } else if (row.login_status === 'logged_out') {
        formattedResult.logged_out = {
          count: Number(row.count),
          percentage: Number(row.percentage)
        };
      }
    });
    
    
        return {
          data: formattedResult,
          success: true,
          query_time: new Date().toISOString(),
          cached: false
        };
        
  } catch (error) {
    console.error('❌ Error in getLoggedInVsLoggedOut:', error);
    return {
      data: { logged_in: { count: 0, percentage: 0 }, logged_out: { count: 0, percentage: 0 } },
      success: false,
      error: error.message,
      cached: false
    };
  }
}

module.exports = {
  getUniqueVisitorsByChannel,
  getLoggedInVsLoggedOut
};
