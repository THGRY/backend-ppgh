/**
 * L1 CHARTS SERVICE - Main Aggregator
 * 
 * This service aggregates all chart functions from distributed chart services
 * and provides a unified interface for the API routes.
 * 
 * Distributed Services:
 * - awarenessEngagementCharts.js - Traffic and engagement charts
 * - conversionCharts.js - Booking and revenue charts
 * - stayPostStayCharts.js - Satisfaction and retention charts
 */

const {
  getUniqueVisitorsByChannel,
  getLoggedInVsLoggedOut
} = require('./charts/awarenessEngagementCharts');

const {
  getBookingFunnel,
  getBookingRevenueTrends
} = require('./charts/conversionCharts');

const {
  getNPSScores,
  getRebookingRates
} = require('./charts/stayPostStayCharts');

/**
 * AWARENESS & ENGAGEMENT ENDPOINT DATA
 * Returns data for 2 charts:
 * - Unique Visitors by Channel (Bar Chart)
 * - Logged In vs Logged Out (Donut Chart)
 */
async function getL1AwarenessEngagementData(fromDate, toDate) {
  try {
    
    // Get both charts data in parallel for performance
    const [visitorsChannelResult, loginStatusResult] = await Promise.all([
      getUniqueVisitorsByChannel(fromDate, toDate),
      getLoggedInVsLoggedOut(fromDate, toDate)
    ]);
    
    // Handle null results from cache misses
    if (!visitorsChannelResult || !loginStatusResult) {
      return {
        success: false,
        error: 'Cache miss - data not available for this date range',
        data: null
      };
    }
    
    // Check if all queries succeeded
    const hasErrors = !visitorsChannelResult.success || !loginStatusResult.success;
    
    if (hasErrors) {
      const errors = [];
      if (!visitorsChannelResult?.success) errors.push(`Visitors by Channel: ${visitorsChannelResult?.error || 'Cache miss - query failed'}`);
      if (!loginStatusResult?.success) errors.push(`Login Status: ${loginStatusResult?.error || 'Cache miss - query failed'}`);
      
      return {
        success: false,
        error: 'One or more chart queries failed',
        details: errors
      };
    }
    
    return {
      success: true,
      result: {
        unique_visitors_by_channel: visitorsChannelResult.data,
        logged_in_vs_out: loginStatusResult.data,
        date_range: `${fromDate} to ${toDate}`,
        charts_count: 2
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getL1AwarenessEngagementData:', error);
    return {
      success: false,
      error: 'Failed to get awareness & engagement data',
      message: error.message
    };
  }
}

/**
 * CONVERSIONS ENDPOINT DATA
 * Returns data for 2 charts:
 * - Booking Funnel (Funnel Chart)
 * - Booking Revenue Trends (Line Chart)
 */
async function getL1ConversionsData(fromDate, toDate) {
  try {
    
    // Get both charts data in parallel for performance
    const [bookingFunnelResult, revenueTrendsResult] = await Promise.all([
      getBookingFunnel(fromDate, toDate),
      getBookingRevenueTrends(fromDate, toDate)
    ]);
    
    // Check if all queries succeeded
    const hasErrors = !bookingFunnelResult.success || !revenueTrendsResult.success;
    
    if (hasErrors) {
      const errors = [];
      if (!bookingFunnelResult.success) errors.push(`Booking Funnel: ${bookingFunnelResult.error}`);
      if (!revenueTrendsResult.success) errors.push(`Revenue Trends: ${revenueTrendsResult.error}`);
      
      return {
        success: false,
        error: 'One or more chart queries failed',
        details: errors
      };
    }
    
    return {
      success: true,
      result: {
        booking_funnel: bookingFunnelResult.data,
        booking_revenue_trends: revenueTrendsResult.data,
        date_range: `${fromDate} to ${toDate}`,
        charts_count: 2
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getL1ConversionsData:', error);
    return {
      success: false,
      error: 'Failed to get conversions data',
      message: error.message
    };
  }
}

/**
 * STAY & POST-STAY ENDPOINT DATA
 * Returns data for 2 charts:
 * - NPS Scores (Bar Chart)
 * - Re-booking Rates (Line Chart)
 */
async function getL1StayPostStayData(fromDate, toDate) {
  try {
    
    // Get both charts data in parallel for performance
    const [npsScoresResult, rebookingRatesResult] = await Promise.all([
      getNPSScores(fromDate, toDate),
      getRebookingRates(fromDate, toDate)
    ]);
    
    // Check if all queries succeeded
    const hasErrors = !npsScoresResult.success || !rebookingRatesResult.success;
    
    if (hasErrors) {
      const errors = [];
      if (!npsScoresResult.success) errors.push(`NPS Scores: ${npsScoresResult.error}`);
      if (!rebookingRatesResult.success) errors.push(`Re-booking Rates: ${rebookingRatesResult.error}`);
      
      return {
        success: false,
        error: 'One or more chart queries failed',
        details: errors
      };
    }
    
    return {
      success: true,
      result: {
        nps_scores: npsScoresResult.data,
        rebooking_rates: rebookingRatesResult.data,
        date_range: `${fromDate} to ${toDate}`,
        charts_count: 2,
        notes: {
          nps: npsScoresResult.note,
          rebooking: "Historical customer analysis based on booking patterns"
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Error in getL1StayPostStayData:', error);
    return {
      success: false,
      error: 'Failed to get stay & post-stay data',
      message: error.message
    };
  }
}

/**
 * INDIVIDUAL CHART FUNCTIONS
 * Export individual chart functions for specific API endpoints
 */

module.exports = {
  // Main endpoint aggregators
  getL1AwarenessEngagementData,
  getL1ConversionsData,
  getL1StayPostStayData,
  
  // Individual chart functions
  getUniqueVisitorsByChannel,
  getLoggedInVsLoggedOut,
  getBookingFunnel,
  getBookingRevenueTrends,
  getNPSScores,
  getRebookingRates
};
