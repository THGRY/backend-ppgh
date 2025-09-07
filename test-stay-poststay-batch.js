// Batch testing Stay & Post-Stay API (2 charts) with 20-day ranges
const axios = require('axios');

async function testStayPostStayAPI() {
  console.log('🎯 BATCH TESTING: STAY & POST-STAY API (2 Charts)');
  console.log('📊 Charts: NPS Scores + Re-booking Rates');
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
      
      const response = await axios.get(`http://localhost:3000/api/l1-stay-poststay`, {
        params: {
          from: range.from,
          to: range.to
        },
        timeout: 30000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.data.success) {
        // Get NPS data
        const npsData = response.data.result.nps_scores;
        const avgNPS = npsData.length > 0 ? 
          Math.round(npsData.reduce((sum, quarter) => sum + quarter.nps_score, 0) / npsData.length) : 0;
        const totalResponses = npsData.reduce((sum, quarter) => sum + quarter.response_count, 0);
        
        // Get rebooking rates data
        const rebookingData = response.data.result.rebooking_rates;
        const avgRebookingRate = rebookingData.length > 0 ?
          Math.round(rebookingData.reduce((sum, quarter) => sum + quarter.rebooking_rate, 0) / rebookingData.length * 10) / 10 : 0;
        const totalGuests = rebookingData.reduce((sum, quarter) => sum + quarter.total_guests, 0);
        
        const result = {
          period: range.name,
          dateRange: `${range.from} to ${range.to}`,
          responseTime: responseTime,
          success: true,
          nps: {
            averageScore: avgNPS,
            totalResponses: totalResponses,
            quarters: npsData.length
          },
          rebooking: {
            averageRate: avgRebookingRate,
            totalGuests: totalGuests,
            quarters: rebookingData.length
          }
        };
        
        results.push(result);
        
        console.log(`  ✅ Time: ${responseTime}ms`);
        console.log(`  📊 NPS: ${avgNPS} avg score (${totalResponses.toLocaleString()} responses, ${npsData.length} quarters)`);
        console.log(`  🔄 Rebooking: ${avgRebookingRate}% avg rate (${totalGuests.toLocaleString()} guests, ${rebookingData.length} quarters)`);
        
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
  console.log('\n🎯 STAY & POST-STAY API SUMMARY');
  console.log('================================');
  
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
    
    console.log(`\n📊 NPS DATA VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: ${result.nps.averageScore} score (${result.nps.totalResponses.toLocaleString()} responses)`);
    });
    
    console.log(`\n🔄 REBOOKING RATES VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: ${result.rebooking.averageRate}% rate (${result.rebooking.totalGuests.toLocaleString()} guests)`);
    });
    
    // Check data variation
    const uniqueNPSScores = new Set(successfulTests.map(r => r.nps.averageScore));
    const uniqueRebookingRates = new Set(successfulTests.map(r => r.rebooking.averageRate));
    
    console.log(`\n🔍 DATA VARIATION ANALYSIS:`);
    console.log(`   Unique NPS Scores: ${uniqueNPSScores.size}`);
    console.log(`   Unique Rebooking Rates: ${uniqueRebookingRates.size}`);
    
    if (uniqueNPSScores.size === 1 && uniqueRebookingRates.size === 1) {
      console.log(`   ⚠️  WARNING: All periods show identical scores - possible caching issue!`);
    } else {
      console.log(`   ✅ GOOD: Different periods show different data`);
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(result => {
      console.log(`   ${result.period}: ${result.error}`);
    });
  }
}

testStayPostStayAPI().catch(console.error);
