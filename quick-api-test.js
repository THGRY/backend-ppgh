/**
 * QUICK API TEST
 * 
 * Fast test to identify if APIs are working and where the bottleneck is
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

async function quickTest() {
  console.log('🚀 QUICK API TEST - Identifying Performance Issues');
  console.log('================================================\n');
  
  // Test 1: Simple date range endpoint (should be fast)
  console.log('📊 Test 1: Date Ranges Endpoint (should be fast)');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}/l1-date-ranges`, {
      timeout: 10000
    });
    const responseTime = Date.now() - startTime;
    
    console.log(`  ✅ Success: ${responseTime}ms`);
    console.log(`  📅 Available data: ${response.data.result?.available_date_range?.from} to ${response.data.result?.available_date_range?.to}`);
  } catch (error) {
    console.log(`  ❌ Failed: ${error.message}`);
  }
  
  console.log('');
  
  // Test 2: Simple metrics with very small date range (1 day)
  console.log('📊 Test 2: Unique Visitors - 1 Day Range (should be fast)');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}/l1-unique-visitors`, {
      params: {
        from: '2025-07-01',
        to: '2025-07-01'
      },
      timeout: 10000
    });
    const responseTime = Date.now() - startTime;
    
    if (response.data.success) {
      console.log(`  ✅ Success: ${responseTime}ms`);
      console.log(`  👥 Visitors: ${response.data.result.value}`);
    } else {
      console.log(`  ❌ API Error: ${response.data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Request Failed: ${error.message}`);
  }
  
  console.log('');
  
  // Test 3: Slightly larger range (1 week)
  console.log('📊 Test 3: Unique Visitors - 1 Week Range');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}/l1-unique-visitors`, {
      params: {
        from: '2025-07-01',
        to: '2025-07-07'
      },
      timeout: 30000
    });
    const responseTime = Date.now() - startTime;
    
    if (response.data.success) {
      console.log(`  ✅ Success: ${responseTime}ms`);
      console.log(`  👥 Visitors: ${response.data.result.value}`);
    } else {
      console.log(`  ❌ API Error: ${response.data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Request Failed: ${error.message}`);
  }
  
  console.log('');
  
  // Test 4: Medium range (20 days as mentioned in requirements)
  console.log('📊 Test 4: Summary Data - 20 Days (the problematic range)');
  try {
    const startTime = Date.now();
    const response = await axios.get(`${API_BASE_URL}/l1-summary-data`, {
      params: {
        from: '2025-07-01',
        to: '2025-07-20'
      },
      timeout: 90000 // 90 seconds
    });
    const responseTime = Date.now() - startTime;
    
    if (response.data.success) {
      console.log(`  ✅ Success: ${responseTime}ms`);
      console.log(`  📊 Metrics:`, JSON.stringify(response.data.result.key_metrics, null, 2));
    } else {
      console.log(`  ❌ API Error: ${response.data.error}`);
    }
  } catch (error) {
    console.log(`  ❌ Request Failed: ${error.message}`);
    console.log(`  🔍 This suggests the database query is taking too long`);
  }
  
  console.log('\n🎯 ANALYSIS:');
  console.log('============');
  console.log('If Tests 1-2 pass but Test 3-4 fail, the issue is database query performance');
  console.log('If all tests fail, there might be a connection or server issue');
  console.log('If tests are slow (>5s), database optimization is needed');
}

quickTest().catch(console.error);
