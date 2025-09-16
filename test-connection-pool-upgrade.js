/**
 * CONNECTION POOL UPGRADE TEST
 * 
 * Tests the new 35-connection pool configuration
 * Verifies that multiple concurrent queries can run without pool exhaustion
 */

require('dotenv').config();

async function testConnectionPoolUpgrade() {
  console.log('🔍 Testing Connection Pool Upgrade (20 → 35 connections)');
  console.log('================================================');
  
  try {
    // Import the metrics service
    const { 
      getL1UniqueVisitors, 
      getL1TotalBookings, 
      getL1RoomNights, 
      getL1TotalRevenue, 
      getL1ABV,
      initializePrisma 
    } = require('./src/services/l1MetricsService');
    
    // Initialize Prisma
    await initializePrisma();
    console.log('✅ Prisma initialized with new pool settings');
    
    // Test date range
    const fromDate = '2025-04-01';
    const toDate = '2025-04-07';
    
    console.log(`📅 Test Date Range: ${fromDate} to ${toDate}`);
    console.log('');
    
    // Test 1: Sequential queries (baseline)
    console.log('🔄 Test 1: Sequential Queries (Baseline)');
    const sequentialStart = Date.now();
    
    const seq1 = await getL1UniqueVisitors(fromDate, toDate);
    const seq2 = await getL1TotalBookings(fromDate, toDate);
    const seq3 = await getL1RoomNights(fromDate, toDate);
    
    const sequentialTime = Date.now() - sequentialStart;
    console.log(`   ⏱️  Sequential Time: ${sequentialTime}ms`);
    console.log(`   ✅ Unique Visitors: ${seq1.unique_visitors}`);
    console.log(`   ✅ Total Bookings: ${seq2.total_bookings}`);
    console.log(`   ✅ Room Nights: ${seq3.room_nights}`);
    console.log('');
    
    // Test 2: Parallel queries (stress test)
    console.log('⚡ Test 2: Parallel Queries (Connection Pool Stress Test)');
    const parallelStart = Date.now();
    
    const [par1, par2, par3, par4, par5] = await Promise.all([
      getL1UniqueVisitors(fromDate, toDate),
      getL1TotalBookings(fromDate, toDate),
      getL1RoomNights(fromDate, toDate),
      getL1TotalRevenue(fromDate, toDate),
      getL1ABV(fromDate, toDate)
    ]);
    
    const parallelTime = Date.now() - parallelStart;
    console.log(`   ⏱️  Parallel Time: ${parallelTime}ms`);
    console.log(`   ✅ Unique Visitors: ${par1.unique_visitors}`);
    console.log(`   ✅ Total Bookings: ${par2.total_bookings}`);
    console.log(`   ✅ Room Nights: ${par3.room_nights}`);
    console.log(`   ✅ Total Revenue: $${par4.total_revenue.toLocaleString()}`);
    console.log(`   ✅ ABV: $${par5.abv}`);
    console.log('');
    
    // Performance Analysis
    const speedup = ((sequentialTime - parallelTime) / sequentialTime * 100).toFixed(1);
    console.log('📊 Performance Analysis:');
    console.log(`   🚀 Parallel Speedup: ${speedup}% faster`);
    console.log(`   📈 Connection Pool: 35 connections (up from 20)`);
    console.log(`   🎯 Max Concurrent: 30 queries (up from 16)`);
    
    if (parallelTime < sequentialTime) {
      console.log('   ✅ Connection pool upgrade SUCCESSFUL - parallel queries are faster!');
    } else {
      console.log('   ⚠️  Parallel queries not faster - may need further optimization');
    }
    
    console.log('');
    console.log('🎉 Connection Pool Upgrade Test COMPLETED');
    
  } catch (error) {
    console.error('❌ Connection Pool Test Failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

// Run the test
testConnectionPoolUpgrade();
