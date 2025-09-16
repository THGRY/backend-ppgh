/**
 * DYNAMIC CONNECTION SCALING TEST
 * 
 * Tests the new intelligent connection pool management system
 * Simulates multiple concurrent users to verify scaling behavior
 */

require('dotenv').config();

async function testDynamicScaling() {
  console.log('🔍 Testing Dynamic Connection Scaling System');
  console.log('=============================================');
  
  try {
    const axios = require('axios');
    const baseURL = 'http://localhost:3000';
    
    // Test date range
    const fromDate = '2025-04-01';
    const toDate = '2025-04-07';
    
    console.log(`📅 Test Date Range: ${fromDate} to ${toDate}`);
    console.log('');
    
    // Test 1: Check scaling stats endpoint
    console.log('🔍 Test 1: Scaling Stats Endpoint');
    try {
      const statsResponse = await axios.get(`${baseURL}/scaling-stats`);
      console.log('✅ Scaling stats endpoint working:');
      console.log(`   📊 Active Connections: ${statsResponse.data.scaling.connectionPool.active}/${statsResponse.data.scaling.connectionPool.max}`);
      console.log(`   📈 Scaling Level: ${statsResponse.data.scaling.connectionPool.scalingLevel}`);
      console.log(`   📋 Queued Requests: ${statsResponse.data.scaling.queue.totalQueued}`);
    } catch (error) {
      console.log('❌ Scaling stats endpoint failed:', error.message);
    }
    console.log('');
    
    // Test 2: Single request (should be fast)
    console.log('🔍 Test 2: Single Request (Baseline)');
    const singleStart = Date.now();
    try {
      const response = await axios.get(`${baseURL}/api/l1-unique-visitors?from=${fromDate}&to=${toDate}`);
      const singleTime = Date.now() - singleStart;
      console.log(`✅ Single request completed: ${singleTime}ms`);
      console.log(`   📊 Unique Visitors: ${response.data.result.value}`);
    } catch (error) {
      console.log('❌ Single request failed:', error.message);
    }
    console.log('');
    
    // Test 3: Concurrent light requests (should not trigger scaling)
    console.log('🔍 Test 3: Concurrent Light Requests (5 parallel)');
    const lightStart = Date.now();
    try {
      const lightRequests = Array(5).fill().map(() => 
        axios.get(`${baseURL}/api/l1-unique-visitors?from=${fromDate}&to=${toDate}`)
      );
      
      const lightResults = await Promise.all(lightRequests);
      const lightTime = Date.now() - lightStart;
      
      console.log(`✅ 5 concurrent light requests completed: ${lightTime}ms`);
      console.log(`   📊 All successful: ${lightResults.every(r => r.data.success)}`);
    } catch (error) {
      console.log('❌ Concurrent light requests failed:', error.message);
    }
    console.log('');
    
    // Test 4: Heavy request (should trigger scaling if pool is busy)
    console.log('🔍 Test 4: Heavy Request (L1 Summary - 5 parallel queries)');
    const heavyStart = Date.now();
    try {
      const heavyResponse = await axios.get(`${baseURL}/api/l1-summary-data?from=${fromDate}&to=${toDate}`);
      const heavyTime = Date.now() - heavyStart;
      
      console.log(`✅ Heavy request completed: ${heavyTime}ms`);
      console.log(`   📊 Metrics loaded: ${Object.keys(heavyResponse.data.result.key_metrics).length}`);
      console.log(`   ⏱️  Response time: ${heavyResponse.data.result.query_performance.response_time_ms}ms`);
    } catch (error) {
      console.log('❌ Heavy request failed:', error.message);
    }
    console.log('');
    
    // Test 5: Stress test - Multiple heavy requests
    console.log('🔍 Test 5: Stress Test (3 concurrent heavy requests)');
    const stressStart = Date.now();
    try {
      const stressRequests = [
        axios.get(`${baseURL}/api/l1-summary-data?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-awareness-engagement?from=${fromDate}&to=${toDate}`),
        axios.get(`${baseURL}/api/l1-conversions?from=${fromDate}&to=${toDate}`)
      ];
      
      const stressResults = await Promise.all(stressRequests);
      const stressTime = Date.now() - stressStart;
      
      console.log(`✅ Stress test completed: ${stressTime}ms`);
      console.log(`   📊 All successful: ${stressResults.every(r => r.data.success)}`);
      console.log(`   📈 Summary: ${stressResults[0].data.result.query_performance.response_time_ms}ms`);
      console.log(`   📈 Awareness: ${stressResults[1].data.result.query_performance.response_time_ms}ms`);
      console.log(`   📈 Conversions: ${stressResults[2].data.result.query_performance.response_time_ms}ms`);
    } catch (error) {
      console.log('❌ Stress test failed:', error.message);
    }
    console.log('');
    
    // Test 6: Final scaling stats
    console.log('🔍 Test 6: Final Scaling Stats');
    try {
      const finalStatsResponse = await axios.get(`${baseURL}/scaling-stats`);
      const stats = finalStatsResponse.data.scaling;
      
      console.log('📊 Final Connection Pool Status:');
      console.log(`   🔗 Active Connections: ${stats.connectionPool.active}/${stats.connectionPool.max}`);
      console.log(`   📈 Scaling Level: ${stats.connectionPool.scalingLevel}`);
      console.log(`   📋 Total Queued: ${stats.queue.totalQueued}`);
      console.log(`   ✅ Total Processed: ${stats.queue.totalProcessed}`);
      console.log(`   ⏱️  Average Wait Time: ${stats.queue.averageWaitTime}ms`);
      console.log(`   📊 Total Queries: ${stats.performance.totalQueries}`);
      console.log(`   ❌ Connection Errors: ${stats.performance.connectionErrors}`);
      console.log(`   🚨 Pool Exhaustion Events: ${stats.performance.poolExhaustionEvents}`);
      
      // Analyze results
      console.log('');
      console.log('🎯 Dynamic Scaling Analysis:');
      if (stats.queue.totalProcessed > 0) {
        console.log(`✅ Scaling system activated - processed ${stats.queue.totalProcessed} queued requests`);
        console.log(`⏱️  Average queue wait time: ${stats.queue.averageWaitTime}ms`);
      } else {
        console.log(`📊 No queuing required - system handled load without scaling`);
      }
      
      if (stats.performance.poolExhaustionEvents === 0) {
        console.log(`✅ No pool exhaustion - dynamic scaling prevented overload`);
      } else {
        console.log(`⚠️  ${stats.performance.poolExhaustionEvents} pool exhaustion events occurred`);
      }
      
    } catch (error) {
      console.log('❌ Final stats failed:', error.message);
    }
    
    console.log('');
    console.log('🎉 Dynamic Scaling Test COMPLETED');
    
  } catch (error) {
    console.error('❌ Dynamic Scaling Test Failed:', error.message);
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const axios = require('axios');
    await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running - starting tests...\n');
    return true;
  } catch (error) {
    console.log('❌ Server not running. Please start the server first:');
    console.log('   npm start');
    return false;
  }
}

// Run the test
checkServer().then(serverRunning => {
  if (serverRunning) {
    testDynamicScaling();
  }
});
