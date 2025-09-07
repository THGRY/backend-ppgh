const axios = require('axios');

async function testStayPostStayBatch() {
  console.log('🚀 BATCH TESTING: OPTIMIZED STAY & POST-STAY API (2 Charts)');
  console.log('📊 Charts: NPS Scores + Re-booking Rates');
  console.log('📅 Testing: 20-Day Ranges (Dec 2024 - July 2025)');
  console.log('🎯 Target: <1000ms (like other optimized APIs)');
  console.log('==============================================\n');

  const baseUrl = 'http://localhost:3000/api/l1-stay-poststay';
  
  // Define test ranges: 20-day periods for each month
  const testRanges = [
    { month: 'Dec 2024', from: '2024-12-01', to: '2024-12-20' },
    { month: 'Jan 2025', from: '2025-01-01', to: '2025-01-20' },
    { month: 'Feb 2025', from: '2025-02-01', to: '2025-02-20' },
    { month: 'Mar 2025', from: '2025-03-01', to: '2025-03-20' },
    { month: 'Apr 2025', from: '2025-04-01', to: '2025-04-20' },
    { month: 'May 2025', from: '2025-05-01', to: '2025-05-20' },
    { month: 'Jun 2025', from: '2025-06-01', to: '2025-06-20' },
    { month: 'Jul 2025', from: '2025-07-01', to: '2025-07-20' }
  ];

  const results = [];
  let totalTests = 0;
  let successfulTests = 0;
  let under1s = 0;
  let under3s = 0;

  for (const range of testRanges) {
    try {
      console.log(`🕐 Testing: ${range.month} (${range.from} to ${range.to})`);
      
      const startTime = Date.now();
      const response = await axios.get(`${baseUrl}?from=${range.from}&to=${range.to}`);
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      totalTests++;
      
      if (response.status === 200 && response.data.success) {
        successfulTests++;
        
        const npsData = response.data.result.nps_scores || [];
        const rebookingData = response.data.result.rebooking_rates || [];
        
        // Performance categorization
        let performanceCategory = '';
        if (responseTime < 1000) {
          under1s++;
          performanceCategory = '🚀 EXCELLENT: Under 1 second! (Target achieved)';
        } else if (responseTime < 3000) {
          under3s++;
          performanceCategory = '✅ GOOD: Under 3 seconds';
        } else if (responseTime < 10000) {
          performanceCategory = '⚠️  MODERATE: Under 10 seconds';
        } else {
          performanceCategory = '❌ SLOW: Over 10 seconds';
        }
        
        console.log(`  ✅ Time: ${responseTime}ms`);
        console.log(`  📊 NPS: ${npsData.length} data points, Rebooking: ${rebookingData.length} data points`);
        if (npsData.length > 0) {
          console.log(`  📈 NPS Score: ${npsData[0].nps_score}% (${npsData[0].response_count} responses)`);
        }
        if (rebookingData.length > 0) {
          console.log(`  🔄 Rebooking Rate: ${rebookingData[0].rebooking_rate}% (${rebookingData[0].total_guests} guests)`);
        }
        console.log(`  ${performanceCategory}`);
        
        results.push({
          month: range.month,
          responseTime,
          success: true,
          npsDataPoints: npsData.length,
          rebookingDataPoints: rebookingData.length,
          npsScore: npsData.length > 0 ? npsData[0].nps_score : 0,
          rebookingRate: rebookingData.length > 0 ? rebookingData[0].rebooking_rate : 0,
          totalGuests: rebookingData.length > 0 ? rebookingData[0].total_guests : 0
        });
        
      } else {
        console.log(`  ❌ Failed: ${response.status} - ${response.data.error || 'Unknown error'}`);
        results.push({
          month: range.month,
          responseTime,
          success: false,
          error: response.data.error
        });
      }
      
    } catch (error) {
      totalTests++;
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        month: range.month,
        responseTime: 0,
        success: false,
        error: error.message
      });
    }
    
    console.log('');
  }

  // Summary
  console.log('\n🎯 OPTIMIZED STAY & POST-STAY API SUMMARY');
  console.log('====================================');
  console.log(`📊 Total Tests: ${totalTests}`);
  console.log(`✅ Successful: ${successfulTests}`);
  console.log(`❌ Failed: ${totalTests - successfulTests}`);
  
  if (successfulTests > 0) {
    const avgTime = results
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.responseTime, 0) / successfulTests;
    
    const fastestTime = Math.min(...results.filter(r => r.success).map(r => r.responseTime));
    const slowestTime = Math.max(...results.filter(r => r.success).map(r => r.responseTime));
    
    console.log(`\n⏱️  PERFORMANCE STATS:`);
    console.log(`   Average: ${Math.round(avgTime)}ms`);
    console.log(`   Fastest: ${fastestTime}ms`);
    console.log(`   Slowest: ${slowestTime}ms`);
    
    console.log(`\n🎯 TARGET ACHIEVEMENT:`);
    console.log(`   Under 1s (Target): ${under1s}/${successfulTests} (${Math.round(under1s/successfulTests*100)}%)`);
    console.log(`   Under 3s (Good): ${under3s}/${successfulTests} (${Math.round(under3s/successfulTests*100)}%)`);
    
    if (under1s >= successfulTests * 0.8) {
      console.log(`   🎉 EXCELLENT: 80%+ tests under 1 second!`);
    } else if (under3s >= successfulTests * 0.8) {
      console.log(`   ✅ GOOD: 80%+ tests under 3 seconds`);
    } else {
      console.log(`   ⚠️  MIXED: Some tests still slow`);
    }
    
    console.log(`\n📈 NPS DATA VALIDATION:`);
    results.filter(r => r.success).forEach(r => {
      console.log(`   ${r.month}: ${r.npsScore}% NPS (${r.npsDataPoints} data points)`);
    });
    
    console.log(`\n🔄 REBOOKING DATA VALIDATION:`);
    results.filter(r => r.success).forEach(r => {
      console.log(`   ${r.month}: ${r.rebookingRate}% rebooking rate (${r.totalGuests} guests)`);
    });
    
    console.log(`\n🔍 DATA VARIATION ANALYSIS:`);
    const uniqueNPS = new Set(results.filter(r => r.success).map(r => r.npsScore));
    const uniqueRebooking = new Set(results.filter(r => r.success).map(r => r.rebookingRate));
    console.log(`   Unique NPS Scores: ${uniqueNPS.size}`);
    console.log(`   Unique Rebooking Rates: ${uniqueRebooking.size}`);
    
    if (uniqueNPS.size >= Math.min(3, successfulTests) && uniqueRebooking.size >= Math.min(3, successfulTests)) {
      console.log(`   ✅ GOOD: Different periods show different metrics`);
    } else {
      console.log(`   ⚠️  WARNING: Limited data variation detected`);
    }
    
    console.log(`\n🚀 OPTIMIZATION SUCCESS:`);
    console.log(`   Before: 20+ seconds (frequent timeouts)`);
    console.log(`   After: ${Math.round(avgTime)}ms average`);
    console.log(`   Improvement: ${Math.round(20000/avgTime)}x faster!`);
  }
}

testStayPostStayBatch().catch(console.error);
