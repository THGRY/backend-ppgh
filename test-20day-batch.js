// Batch testing 20-day ranges from Dec 2024 to July 2025
const axios = require('axios');

async function test20DayRanges() {
  console.log('🎯 BATCH TESTING: 20-Day Ranges (Dec 2024 - July 2025)');
  console.log('📊 API: Awareness & Engagement');
  console.log('===============================================\n');

  // Define 20-day test ranges from Dec 2024 to July 2025
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
      
      const response = await axios.get(`http://localhost:3000/api/l1-awareness-engagement`, {
        params: {
          from: range.from,
          to: range.to
        },
        timeout: 30000 // 30 second timeout
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      if (response.data.success) {
        // Get top channel data
        const channels = response.data.result.unique_visitors_by_channel;
        const topChannel = channels.reduce((max, channel) => 
          channel.visitors > max.visitors ? channel : max, channels[0]);
        
        // Get login data
        const loginData = response.data.result.logged_in_vs_out;
        const totalUsers = loginData.logged_in.count + loginData.logged_out.count;
        
        const result = {
          period: range.name,
          dateRange: `${range.from} to ${range.to}`,
          responseTime: responseTime,
          success: true,
          topChannel: {
            name: topChannel.channel,
            visitors: topChannel.visitors
          },
          totalUsers: totalUsers,
          loginRate: loginData.logged_in.percentage
        };
        
        results.push(result);
        
        console.log(`  ✅ Time: ${responseTime}ms`);
        console.log(`  📊 Top Channel: ${topChannel.channel} (${topChannel.visitors.toLocaleString()} visitors)`);
        console.log(`  👥 Total Users: ${totalUsers.toLocaleString()}`);
        console.log(`  🔐 Login Rate: ${loginData.logged_in.percentage}%`);
        
        // Performance classification
        if (responseTime < 500) {
          console.log(`  🚀 VERY FAST`);
        } else if (responseTime < 1000) {
          console.log(`  ✅ FAST`);
        } else if (responseTime < 2000) {
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
    
    console.log(''); // Empty line for readability
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary Report
  console.log('\n🎯 SUMMARY REPORT');
  console.log('=================');
  
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
    
    console.log(`\n📈 DATA VALIDATION:`);
    successfulTests.forEach(result => {
      console.log(`   ${result.period}: ${result.topChannel.name} (${result.topChannel.visitors.toLocaleString()} visitors)`);
    });
    
    // Check for data variation
    const uniqueTopChannels = new Set(successfulTests.map(r => r.topChannel.name));
    const uniqueVisitorCounts = new Set(successfulTests.map(r => r.topChannel.visitors));
    
    console.log(`\n🔍 DATA VARIATION ANALYSIS:`);
    console.log(`   Unique Top Channels: ${uniqueTopChannels.size} (${Array.from(uniqueTopChannels).join(', ')})`);
    console.log(`   Unique Visitor Counts: ${uniqueVisitorCounts.size}`);
    
    if (uniqueVisitorCounts.size === 1) {
      console.log(`   ⚠️  WARNING: All periods show identical visitor counts - possible caching issue!`);
    } else {
      console.log(`   ✅ GOOD: Different periods show different visitor counts - data is varying correctly`);
    }
  }
  
  if (failedTests.length > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    failedTests.forEach(result => {
      console.log(`   ${result.period}: ${result.error}`);
    });
  }
}

test20DayRanges().catch(console.error);
