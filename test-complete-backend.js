/**
 * COMPLETE BACKEND API TEST
 * 
 * Tests ALL API endpoints to verify dynamic scaling under full load
 * Simulates real dashboard usage patterns
 */

require('dotenv').config();

async function testCompleteBackend() {
  console.log('🔍 Testing COMPLETE Backend API System');
  console.log('=====================================');
  
  try {
    const axios = require('axios');
    const baseURL = 'http://localhost:3000';
    
    // Test date range
    const fromDate = '2025-04-01';
    const toDate = '2025-04-07';
    
    console.log(`📅 Test Date Range: ${fromDate} to ${toDate}`);
    console.log('');
    
    // Test 1: System Health Endpoints
    console.log('🔍 Test 1: System Health & Info Endpoints');
    const systemStart = Date.now();
    try {
      const [healthResponse, dateRangesResponse, scalingResponse] = await Promise.all([
        axios.get(`${baseURL}/health`),
        axios.get(`${baseURL}/api/l1-date-ranges`),
        axios.get(`${baseURL}/scaling-stats`)
      ]);
      
      const systemTime = Date.now() - systemStart;
      console.log(`✅ System endpoints completed: ${systemTime}ms`);
      console.log(`   🏥 Health: ${healthResponse.data.status}`);
      console.log(`   📅 Date ranges: Available`);
      console.log(`   📊 Scaling: ${scalingResponse.data.scaling.connectionPool.scalingLevel} level`);
    } catch (error) {
      console.log('❌ System endpoints failed:', error.message);
    }
    console.log('');
    
    // Test 2: All Individual Metric APIs
    console.log('🔍 Test 2: All Individual Metric APIs (5 endpoints)');
    const metricsStart = Date.now();
    try {
      const metricRequests = [
        axios.get(`${baseURL}/api/l1-unique-visitors?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-total-bookings?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-room-nights?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-total-revenue?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-abv?from=${fromDate}&to=${toDate}`)
      ];
      
      const metricResults = await Promise.all(metricRequests);
      const metricsTime = Date.now() - metricsStart;
      
      console.log(`✅ All 5 metric APIs completed: ${metricsTime}ms`);
      console.log(`   👥 Unique Visitors: ${metricResults[0].data.result.value.toLocaleString()}`);
      console.log(`   🏨 Total Bookings: ${metricResults[1].data.result.value.toLocaleString()}`);
      console.log(`   🛏️  Room Nights: ${metricResults[2].data.result.value.toLocaleString()}`);
      console.log(`   💰 Total Revenue: $${metricResults[3].data.result.value.toLocaleString()}`);
      console.log(`   📊 ABV: $${metricResults[4].data.result.value}`);
    } catch (error) {
      console.log('❌ Individual metrics failed:', error.message);
    }
    console.log('');
    
    // Test 3: All Chart APIs
    console.log('🔍 Test 3: All Chart APIs (3 endpoints)');
    const chartsStart = Date.now();
    try {
      const chartRequests = [
        axios.get(`${baseURL}/api/l1-awareness-engagement?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-conversions?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-stay-poststay?from=${fromDate}&to=${toDate}`)
      ];
      
      const chartResults = await Promise.all(chartRequests);
      const chartsTime = Date.now() - chartsStart;
      
      console.log(`✅ All 3 chart APIs completed: ${chartsTime}ms`);
      console.log(`   📊 Awareness & Engagement: ${chartResults[0].data.result.query_performance.response_time_ms}ms`);
      console.log(`   🔄 Conversions: ${chartResults[1].data.result.query_performance.response_time_ms}ms`);
      console.log(`   📈 Stay & Post-Stay: ${chartResults[2].data.result.query_performance.response_time_ms}ms`);
    } catch (error) {
      console.log('❌ Chart APIs failed:', error.message);
    }
    console.log('');
    
    // Test 4: Heavy Summary API
    console.log('🔍 Test 4: Heavy Summary API (5 parallel queries)');
    const summaryStart = Date.now();
    try {
      const summaryResponse = await axios.get(`${baseURL}/api/l1-summary-data?from=${fromDate}&to=${toDate}`);
      const summaryTime = Date.now() - summaryStart;
      
      console.log(`✅ Summary API completed: ${summaryTime}ms`);
      console.log(`   📊 All 5 metrics loaded successfully`);
      console.log(`   ⏱️  Internal response time: ${summaryResponse.data.result.query_performance.response_time_ms}ms`);
    } catch (error) {
      console.log('❌ Summary API failed:', error.message);
    }
    console.log('');
    
    // Test 5: STRESS TEST - Simulate Multiple Dashboard Users
    console.log('🔍 Test 5: STRESS TEST - Multiple Dashboard Users (15 concurrent requests)');
    const stressStart = Date.now();
    try {
      // Simulate 3 users loading dashboards simultaneously
      const user1Requests = [
        axios.get(`${baseURL}/api/l1-summary-data?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-awareness-engagement?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-conversions?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-stay-poststay?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-unique-visitors?from=${fromDate}&to=${toDate}`)
      ];
      
      const user2Requests = [
        axios.get(`${baseURL}/api/l1-summary-data?from=2025-05-01&to=2025-05-07`),
        axios.get(`${baseURL}/api/l1-awareness-engagement?from=2025-05-01&to=2025-05-07`),
        axios.get(`${baseURL}/api/l1-conversions?from=2025-05-01&to=2025-05-07`),
        axios.get(`${baseURL}/api/l1-stay-poststay?from=2025-05-01&to=2025-05-07`),
        axios.get(`${baseURL}/api/l1-total-bookings?from=2025-05-01&to=2025-05-07`)
      ];
      
      const user3Requests = [
        axios.get(`${baseURL}/api/l1-summary-data?from=2025-06-01&to=2025-06-07`),
        axios.get(`${baseURL}/api/l1-awareness-engagement?from=2025-06-01&to=2025-06-07`),
        axios.get(`${baseURL}/api/l1-conversions?from=2025-06-01&to=2025-06-07`),
        axios.get(`${baseURL}/api/l1-stay-poststay?from=2025-06-01&to=2025-06-07`),
        axios.get(`${baseURL}/api/l1-room-nights?from=2025-06-01&to=2025-06-07`)
      ];
      
      // Execute all 15 requests simultaneously
      const allStressRequests = [...user1Requests, ...user2Requests, ...user3Requests];
      const stressResults = await Promise.all(allStressRequests);
      const stressTime = Date.now() - stressStart;
      
      console.log(`✅ STRESS TEST completed: ${stressTime}ms`);
      console.log(`   📊 Total requests: ${allStressRequests.length}`);
      console.log(`   ✅ Success rate: ${stressResults.filter(r => r.data.success).length}/${stressResults.length}`);
      console.log(`   ⏱️  Average per request: ${Math.round(stressTime / allStressRequests.length)}ms`);
      
      // Check if any requests failed
      const failedRequests = stressResults.filter(r => !r.data.success);
      if (failedRequests.length > 0) {
        console.log(`   ❌ Failed requests: ${failedRequests.length}`);
      }
      
    } catch (error) {
      console.log('❌ Stress test failed:', error.message);
    }
    console.log('');
    
    // Test 6: Final System Analysis
    console.log('🔍 Test 6: Final System Analysis');
    try {
      const finalStatsResponse = await axios.get(`${baseURL}/scaling-stats`);
      const stats = finalStatsResponse.data.scaling;
      
      console.log('📊 Complete Backend Performance Analysis:');
      console.log(`   🔗 Peak Connections Used: ${stats.connectionPool.active}/${stats.connectionPool.max}`);
      console.log(`   📈 Final Scaling Level: ${stats.connectionPool.scalingLevel}`);
      console.log(`   📋 Total Requests Queued: ${stats.queue.totalQueued}`);
      console.log(`   ✅ Total Requests Processed: ${stats.queue.totalProcessed}`);
      console.log(`   ⏱️  Average Queue Wait: ${stats.queue.averageWaitTime}ms`);
      console.log(`   📊 Total Database Queries: ${stats.performance.totalQueries}`);
      console.log(`   ❌ Connection Errors: ${stats.performance.connectionErrors}`);
      console.log(`   🚨 Pool Exhaustion Events: ${stats.performance.poolExhaustionEvents}`);
      
      console.log('');
      console.log('🎯 COMPLETE BACKEND ANALYSIS:');
      
      // Analyze scaling effectiveness
      if (stats.queue.totalProcessed > 0) {
        console.log(`🔄 Dynamic scaling WAS ACTIVATED:`);
        console.log(`   📋 Queued ${stats.queue.totalQueued} requests`);
        console.log(`   ✅ Processed ${stats.queue.totalProcessed} from queue`);
        console.log(`   ⏱️  Average wait time: ${stats.queue.averageWaitTime}ms`);
      } else {
        console.log(`📊 Dynamic scaling NOT NEEDED:`);
        console.log(`   ✅ All requests handled without queuing`);
        console.log(`   🚀 Connection pool capacity was sufficient`);
      }
      
      // Overall health assessment
      if (stats.performance.connectionErrors === 0 && stats.performance.poolExhaustionEvents === 0) {
        console.log(`✅ EXCELLENT: No connection issues detected`);
      } else {
        console.log(`⚠️  ISSUES: ${stats.performance.connectionErrors} errors, ${stats.performance.poolExhaustionEvents} exhaustions`);
      }
      
      // Performance rating
      const totalQueries = stats.performance.totalQueries;
      if (totalQueries > 50) {
        console.log(`🏆 HIGH LOAD TEST: Processed ${totalQueries} database queries successfully`);
      } else {
        console.log(`📊 MODERATE LOAD: Processed ${totalQueries} database queries`);
      }
      
    } catch (error) {
      console.log('❌ Final analysis failed:', error.message);
    }
    
    console.log('');
    console.log('🎉 COMPLETE BACKEND TEST FINISHED');
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Complete Backend Test Failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const axios = require('axios');
    await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running - testing complete backend...\n');
    return true;
  } catch (error) {
    console.log('❌ Server not running. Please start the server first:');
    console.log('   npm start');
    return false;
  }
}

// Run the complete test
checkServer().then(serverRunning => {
  if (serverRunning) {
    testCompleteBackend();
  }
});
