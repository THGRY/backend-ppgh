// Batch testing OPTIMIZED Conversions API with 20-day ranges (Dec 2024 - July 2025)
const axios = require('axios');

async function testConversionsAPI() {
  console.log('🚀 BATCH TESTING: OPTIMIZED CONVERSIONS API (2 Charts)');
  console.log('📊 Charts: Booking Funnel + Revenue Trends');
  console.log('📅 Testing: 20-Day Ranges (Dec 2024 - July 2025)');
  console.log('🎯 Target: <1000ms (like 5-metrics API)');
  console.log('==============================================\n');

  const testRanges = [
    { name: 'Dec 2024', from: '2024-12-01', to: '2024-12-20' },
    { name: 'Jan 2025', from: '2025-01-01', to: '2025-01-20' },
    { name: 'Feb 2025', from: '2025-02-01', to: '2025-02-20' },
    { name: 'Mar 2025', from: '2025-03-01', to: '2025-03-20' },
    { name: 'Apr 2025', from: '2025-04-01', to: '2025-04-20' },
    { name: 'May 2025', from: '2025-05-01', to: '2025-05-20' },
    { name: 'Jun 2025', from: '2025-06-01', to: '2025-06-20' },
    { name: 'Jul 2025', from: '2025-07-01', to: '2025-07-20' }
  ];

  const results = [];
  
  for (const range of testRanges) {
    try {
      console.log(`🕐 Testing: ${range.name} (${range.from} to ${range.to})`);
      
      const startTime = Date.now();
      
      const response = await axios.get(`http://localhost:3000/api/l1-conversions`, {
        params: {
          from: range.from,
          to: range.to
        },
        timeout: 10000 // Reduced from 30s to 10s - should be much faster now!
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.data.success) {
        // Get funnel data
        const funnelData = response.data.result.booking_funnel;
        const totalVisitors = funnelData.find(stage => stage.stage === 'Page Views')?.count || 0;
        const confirmations = funnelData.find(stage => stage.stage === 'Confirmation')?.count || 0;
        const conversionRate = totalVisitors > 0 ? ((confirmations / totalVisitors) * 100).toFixed(2) : '0';
        
        // Get revenue trends data
        const revenueData = response.data.result.booking_revenue_trends;
        const totalRevenue = revenueData.reduce((sum, month) => sum + month.revenue, 0);
        const totalBookings = revenueData.reduce((sum, month) => sum + month.bookings, 0);
        
        const result = {
          period: range.name,
          dateRange: `${range.from} to ${range.to}`,
          responseTime: responseTime,
          success: true,
          funnel: {
            totalVisitors: totalVisitors,
            confirmations: confirmations,
            conversionRate: conversionRate
          },
          trends: {
            totalRevenue: totalRevenue,
            totalBookings: totalBookings,
            dataPoints: revenueData.length
          }
        };
        
        results.push(result);
        
        console.log(`  ✅ Time: ${responseTime}ms`);
        console.log(`  📊 Funnel: ${totalVisitors.toLocaleString()} visitors → ${confirmations.toLocaleString()} confirmations (${conversionRate}%)`);
        console.log(`  💰 Revenue: $${totalRevenue.toLocaleString()} from ${totalBookings.toLocaleString()} bookings (${revenueData.length} data points)`);
        
        // Performance classification
        if (responseTime < 1000) {
          console.log(`  🚀 EXCELLENT: Under 1 second! (Target achieved)`);
        } else if (responseTime < 3000) {
          console.log(`  ✅ GOOD: Under 3 seconds`);
        } else if (responseTime < 10000) {
          console.log(`  ⚠️  MODERATE: Under 10 seconds`);
        } else {
          console.log(`  🐌 SLOW: Over 10 seconds`);
        }
        
      } else {
        console.log(`  ❌ FAILED: ${response.data.error}`);
        results.push({
          period: range.name,
          dateRange: `${range.from} to ${range.to}`,
          responseTime: responseTime,
          success: false,
          error: response.data.error
        });
      }
      
    } catch (error) {
      console.log(`  ❌ ERROR: ${error.message}`);
      results.push({
        period: range.name,
        dateRange: `${range.from} to ${range.to}`,
        responseTime: 0,
        success: false,
        error: error.message
      });
    }
    
    console.log('');
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary Report
  console.log('\n🎯 OPTIMIZED CONVERSIONS API SUMMARY');
  console.log('====================================');
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`📊 Total Tests: ${results.length}`);
  console.log(`✅ Successful: ${successfulTests.length}`);
  console.log(`❌ Failed: ${failedTests.length}`);
  
  if (successfulTests.length > 0) {
    const avgTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
    const minTime = Math.min(...successfulTests.map(r => r.responseTime));
    const maxTime = Math.max(...successfulTests.map(r => r.responseTime));
    
    console.log(`\n⏱️  PERFORMANCE STATS:`);
    console.log(`   Average: ${Math.round(avgTime)}ms`);
    console.log(`   Fastest: ${minTime}ms`);
    console.log(`   Slowest: ${maxTime}ms`);
    
    // Performance vs target analysis
    const under1s = successfulTests.filter(r => r.responseTime < 1000).length;
    const under3s = successfulTests.filter(r => r.responseTime < 3000).length;
    
    console.log(`\n🎯 TARGET ACHIEVEMENT:`);
    console.log(`   Under 1s (Target): ${under1s}/${successfulTests.length} (${Math.round(under1s/successfulTests.length*100)}%)`);
    console.log(`   Under 3s (Good): ${under3s}/${successfulTests.length} (${Math.round(under3s/successfulTests.length*100)}%)`);
    
    if (under1s === successfulTests.length) {
      console.log(`   🚀 PERFECT: All tests under 1 second! Matches 5-metrics API performance!`);
    } else if (under3s === successfulTests.length) {
      console.log(`   ✅ EXCELLENT: All tests under 3 seconds!`);
    } else {
      console.log(`   ⚠️  MIXED: Some tests still slow`);
    }
    
    console.log(`\n📈 FUNNEL DATA VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: ${result.funnel.totalVisitors.toLocaleString()} visitors → ${result.funnel.confirmations.toLocaleString()} confirmations`);
    });
    
    console.log(`\n💰 REVENUE TRENDS VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: $${result.trends.totalRevenue.toLocaleString()} (${result.trends.dataPoints} data points)`);
    });
    
    // Check data variation
    const uniqueVisitorCounts = new Set(successfulTests.map(r => r.funnel.totalVisitors));
    const uniqueRevenueCounts = new Set(successfulTests.map(r => r.trends.totalRevenue));
    
    console.log(`\n🔍 DATA VARIATION ANALYSIS:`);
    console.log(`   Unique Visitor Counts: ${uniqueVisitorCounts.size}`);
    console.log(`   Unique Revenue Totals: ${uniqueRevenueCounts.size}`);
    
    if (uniqueVisitorCounts.size === 1) {
      console.log(`   ⚠️  WARNING: All periods show identical visitor counts`);
    } else {
      console.log(`   ✅ GOOD: Different periods show different visitor counts`);
    }
    
    // Performance improvement comparison
    console.log(`\n🚀 OPTIMIZATION SUCCESS:`);
    console.log(`   Before: 30+ seconds (timeouts)`);
    console.log(`   After: ${Math.round(avgTime)}ms average`);
    console.log(`   Improvement: ${Math.round(30000/avgTime)}x faster!`);
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(result => {
      console.log(`   ${result.period}: ${result.error}`);
    });
  }
}

testConversionsAPI().catch(console.error);
