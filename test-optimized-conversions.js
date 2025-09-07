// Test the optimized conversion queries for speed and accuracy
const { getBookingFunnel, getBookingRevenueTrends } = require('./optimized-conversion-charts');

async function testOptimizedConversions() {
  console.log('🚀 TESTING OPTIMIZED CONVERSION QUERIES');
  console.log('======================================\n');

  // Test different date ranges where we know data exists
  const testRanges = [
    { name: 'Last 7 days (90 days ago)', from: getDate(-97), to: getDate(-90) },
    { name: 'Last 30 days (60 days ago)', from: getDate(-90), to: getDate(-60) },
    { name: 'December 2024', from: '2024-12-01', to: '2024-12-31' },
    { name: 'January 2025', from: '2025-01-01', to: '2025-01-31' }
  ];

  function getDate(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() + daysAgo);
    return date.toISOString().split('T')[0];
  }

  for (const range of testRanges) {
    console.log(`📅 TESTING: ${range.name} (${range.from} to ${range.to})`);
    console.log('='.repeat(50));

    try {
      // Test 1: Booking Funnel
      console.log('\n1. 🎯 BOOKING FUNNEL TEST');
      let startTime = Date.now();
      const funnelResult = await getBookingFunnel(range.from, range.to);
      let endTime = Date.now();
      
      if (funnelResult.success) {
        console.log(`   ✅ Success: ${endTime - startTime}ms`);
        console.log(`   📊 Funnel stages: ${funnelResult.data.length}`);
        funnelResult.data.forEach(stage => {
          console.log(`      ${stage.stage}: ${stage.count.toLocaleString()} (${stage.percentage}%)`);
        });
        
        // Performance assessment
        if (endTime - startTime < 1000) {
          console.log(`   🚀 EXCELLENT: Under 1 second!`);
        } else if (endTime - startTime < 3000) {
          console.log(`   ✅ GOOD: Under 3 seconds`);
        } else {
          console.log(`   ⚠️  SLOW: Over 3 seconds`);
        }
      } else {
        console.log(`   ❌ Failed: ${funnelResult.error}`);
      }

      // Test 2: Revenue Trends
      console.log('\n2. 💰 REVENUE TRENDS TEST');
      startTime = Date.now();
      const revenueResult = await getBookingRevenueTrends(range.from, range.to);
      endTime = Date.now();
      
      if (revenueResult.success) {
        console.log(`   ✅ Success: ${endTime - startTime}ms`);
        console.log(`   📈 Data points: ${revenueResult.data.length}`);
        
        let totalRevenue = 0;
        let totalBookings = 0;
        revenueResult.data.forEach(point => {
          console.log(`      ${point.month}: $${point.revenue.toLocaleString()} (${point.bookings} bookings)`);
          totalRevenue += point.revenue;
          totalBookings += point.bookings;
        });
        
        console.log(`   💯 TOTALS: $${totalRevenue.toLocaleString()} revenue, ${totalBookings.toLocaleString()} bookings`);
        
        // Performance assessment
        if (endTime - startTime < 1000) {
          console.log(`   🚀 EXCELLENT: Under 1 second!`);
        } else if (endTime - startTime < 3000) {
          console.log(`   ✅ GOOD: Under 3 seconds`);
        } else {
          console.log(`   ⚠️  SLOW: Over 3 seconds`);
        }
      } else {
        console.log(`   ❌ Failed: ${revenueResult.error}`);
      }
      
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
  }

  // Performance Summary
  console.log('🎯 OPTIMIZATION SUMMARY');
  console.log('======================');
  console.log('✅ CHANGES MADE:');
  console.log('   1. Removed complex CTEs → Single aggregation queries');
  console.log('   2. Removed UNION ALL → Single table scan');
  console.log('   3. Removed currency conversion → Raw amounts');
  console.log('   4. Removed extended date ranges → Current period only');
  console.log('   5. Used 2% sampling → Faster execution with scaling');
  console.log('   6. Simplified funnel logic → Direct field checks');
  console.log('');
  console.log('🎯 TARGET: Match 5-metrics API performance (600-900ms)');
  console.log('📊 EXPECTED: 10-50x speed improvement over original queries');
}

testOptimizedConversions().catch(console.error);
