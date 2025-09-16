const axios = require('axios');

async function testSummaryAPI() {
  try {
    console.log('🚀 Testing L1 Summary API with OPTIMIZED Queries');
    console.log('=' .repeat(60));
    
    const fromDate = '2025-04-01';
    const toDate = '2025-04-30';
    console.log(`📅 Testing with April 2025: ${fromDate} to ${toDate}`);
    console.log('');
    
    const startTime = Date.now();
    
    console.log('⚡ Calling /api/l1-summary-data...');
    
    const response = await axios.get(`http://localhost:3000/api/l1-summary-data?from=${fromDate}&to=${toDate}`, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    console.log('📊 API RESPONSE:');
    console.log('=' .repeat(40));
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response Time: ${responseTime}ms`);
    console.log('');
    
    if (response.data.success) {
      const metrics = response.data.result.key_metrics;
      
      console.log('✅ ALL 5 OPTIMIZED METRICS:');
      console.log('=' .repeat(40));
      console.log(`1. Unique Visitors: ${metrics.unique_visitors.toLocaleString()}`);
      console.log(`2. Total Bookings: ${metrics.total_bookings.toLocaleString()}`);
      console.log(`3. Room Nights: ${metrics.room_nights.toLocaleString()}`);
      console.log(`4. Total Revenue: $${metrics.total_revenue.toLocaleString()} USD`);
      console.log(`5. Average Booking Value: $${metrics.abv} USD`);
      console.log('');
      
      // Performance metrics from API
      const perf = response.data.result.query_performance;
      console.log('⚡ PERFORMANCE METRICS:');
      console.log('=' .repeat(40));
      console.log(`🔥 API Response Time: ${perf.response_time_ms}ms`);
      console.log(`📈 Total Response Time: ${responseTime}ms`);
      console.log(`⚡ Metrics Count: ${perf.metrics_count}`);
      console.log(`🚀 Parallel Execution: ${perf.parallel_execution}`);
      console.log('');
      
      // Business insights
      console.log('📈 BUSINESS INSIGHTS:');
      console.log('=' .repeat(40));
      const conversionRate = (metrics.total_bookings / metrics.unique_visitors * 100).toFixed(2);
      const avgNightsPerBooking = (metrics.room_nights / metrics.total_bookings).toFixed(1);
      const revenuePerVisitor = (metrics.total_revenue / metrics.unique_visitors).toFixed(2);
      
      console.log(`📊 Conversion Rate: ${conversionRate}%`);
      console.log(`🏨 Avg Nights/Booking: ${avgNightsPerBooking} nights`);
      console.log(`💰 Revenue per Visitor: $${revenuePerVisitor}`);
      console.log('');
      
      console.log('🎉 SUCCESS: All optimized queries working perfectly!');
      
    } else {
      console.log('❌ API ERROR:', response.data.error);
      if (response.data.failed_metrics) {
        console.log('Failed metrics:', response.data.failed_metrics);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testSummaryAPI();
