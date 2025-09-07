// Batch testing Conversions API (2 charts) with 20-day ranges
const axios = require('axios');

async function testConversionsAPI() {
  console.log('🎯 BATCH TESTING: CONVERSIONS API (2 Charts)');
  console.log('📊 Charts: Booking Funnel + Revenue Trends');
  console.log('📅 Testing: 20-Day Ranges (Dec 2024 - July 2025)');
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
        timeout: 30000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.data.success) {
        // Get funnel data (first stage = total visitors)
        const funnelData = response.data.result.booking_funnel;
        const totalVisitors = funnelData.find(stage => stage.stage === 'Page Views')?.count || 0;
        const confirmations = funnelData.find(stage => stage.stage === 'Confirmation')?.count || 0;
        
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
            conversionRate: totalVisitors > 0 ? ((confirmations / totalVisitors) * 100).toFixed(2) : '0'
          },
          trends: {
            totalRevenue: totalRevenue,
            totalBookings: totalBookings,
            dataPoints: revenueData.length
          }
        };
        
        results.push(result);
        
        console.log(`  ✅ Time: ${responseTime}ms`);
        console.log(`  📊 Funnel: ${totalVisitors.toLocaleString()} visitors → ${confirmations.toLocaleString()} confirmations (${result.funnel.conversionRate}%)`);
        console.log(`  💰 Revenue Trends: $${totalRevenue.toLocaleString()} from ${totalBookings.toLocaleString()} bookings (${revenueData.length} data points)`);
        
        // Performance classification
        if (responseTime < 1000) {
          console.log(`  ✅ FAST`);
        } else if (responseTime < 3000) {
          console.log(`  ⚠️  MODERATE`);
        } else {
          console.log(`  🐌 SLOW`);
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
  console.log('\n🎯 CONVERSIONS API SUMMARY');
  console.log('===========================');
  
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
    
    console.log(`\n📈 FUNNEL DATA VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: ${result.funnel.totalVisitors.toLocaleString()} visitors → ${result.funnel.confirmations.toLocaleString()} confirmations`);
    });
    
    console.log(`\n💰 REVENUE TRENDS VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: $${result.trends.totalRevenue.toLocaleString()} (${result.trends.dataPoints} months)`);
    });
    
    // Check data variation
    const uniqueVisitorCounts = new Set(successfulTests.map(r => r.funnel.totalVisitors));
    const uniqueRevenueCounts = new Set(successfulTests.map(r => r.trends.totalRevenue));
    
    console.log(`\n🔍 DATA VARIATION ANALYSIS:`);
    console.log(`   Unique Visitor Counts: ${uniqueVisitorCounts.size}`);
    console.log(`   Unique Revenue Totals: ${uniqueRevenueCounts.size}`);
    
    if (uniqueVisitorCounts.size === 1) {
      console.log(`   ⚠️  WARNING: All periods show identical visitor counts - possible caching issue!`);
    } else {
      console.log(`   ✅ GOOD: Different periods show different visitor counts`);
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(result => {
      console.log(`   ${result.period}: ${result.error}`);
    });
  }
}

testConversionsAPI().catch(console.error);
