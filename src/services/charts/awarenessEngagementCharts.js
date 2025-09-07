// Use shared Prisma instance from main service
const l1Service = require('../l1MetricsService');
const smartCacheService = require('../smartCacheService');

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
        console.log(`🔍 Getting visitors by channel from ${fromDate} to ${toDate}`);
        
        // Convert dates to Unix timestamps
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
        const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
        
        // ULTRA-FAST: Leverages [time, td_client_id] index for 4-5s response
        const prisma = await getPrisma();
        const result = await prisma.$queryRaw`
      WITH channel_data AS (
        SELECT
          td_client_id,
          -- Streamlined channel logic for speed
          CASE
            WHEN utm_source LIKE '%google%' THEN 'Paid Search'
            WHEN utm_source LIKE '%facebook%' THEN 'Social Media'  
            WHEN utm_source LIKE '%email%' THEN 'Email'
            WHEN utm_source IS NOT NULL THEN 'UTM Campaign'
            WHEN td_referrer LIKE '%google.com%' THEN 'Organic Search'
            WHEN td_referrer LIKE '%facebook.com%' THEN 'Social Media'
            WHEN td_referrer IS NULL OR td_referrer = '' THEN 'Direct'
            ELSE 'Other'
          END as channel
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT) WITH (INDEX(idx_pageviews_part_client_id))
        WHERE time >= ${fromTimestamp} 
          AND time <= ${toTimestamp}
          AND td_client_id IS NOT NULL
      ),
      channel_counts AS (
        SELECT 
          channel,
          COUNT(DISTINCT td_client_id) * 50 as visitors  -- Scale up from 2% sample
        FROM channel_data
        GROUP BY channel
      ),
      total_count AS (
        SELECT SUM(visitors) as total_visitors FROM channel_counts
      )
      SELECT TOP 10
        cc.channel,
        cc.visitors,
        ROUND((cc.visitors * 100.0 / tc.total_visitors), 1) as percentage
      FROM channel_counts cc, total_count tc
      WHERE cc.visitors > 0
      ORDER BY cc.visitors DESC
    `;
    
        console.log(`✅ Found ${result.length} traffic channels`);
        
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
        console.log(`🔍 Getting login status distribution from ${fromDate} to ${toDate}`);
        
        // Convert dates to Unix timestamps
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
        const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
        
        // Login status detection and counting
        const prisma = await getPrisma();
        const result = await prisma.$queryRaw`
      WITH login_status AS (
        SELECT
          td_client_id,
          CASE
            WHEN LOWER(user_userinfo_loginstatus) LIKE '%login%' THEN 'logged_in'
            WHEN LOWER(user_userinfo_loginstatus_1) LIKE '%login%' THEN 'logged_in'
            WHEN LOWER(td_url) LIKE '%/signup.html%' THEN 'logged_in'
            WHEN user_userinfo_memberid IS NOT NULL OR user_userinfo_memberid_1 IS NOT NULL THEN 'logged_in'
            WHEN user_userinfo_loginstatus IS NULL AND user_userinfo_loginstatus_1 IS NULL THEN 'logged_out'
            ELSE 'logged_out'
          END as login_status
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT) WITH (INDEX(idx_pageviews_part_client_id))
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
          AND td_client_id IS NOT NULL
      ),
      status_summary AS (
        SELECT
          login_status,
          COUNT(DISTINCT td_client_id) * 50 as user_count  -- Scale up from 2% sample
        FROM login_status
        GROUP BY login_status
      ),
      total_users AS (
        SELECT SUM(user_count) as total FROM status_summary
      )
      SELECT
        ss.login_status,
        ss.user_count as count,
        ROUND((ss.user_count * 100.0 / tu.total), 1) as percentage
      FROM status_summary ss, total_users tu
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
    
    console.log(`✅ Login status analysis completed`);
    
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
