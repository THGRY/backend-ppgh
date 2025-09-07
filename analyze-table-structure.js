/**
 * Table Structure & Performance Analysis
 * 
 * This script analyzes the pageviews_partitioned table to understand:
 * 1. Column types and distributions
 * 2. Index usage and missing indexes
 * 3. Data sampling strategies for 4-5s responses
 */

require('dotenv').config();
const { prisma } = require('./src/services/l1MetricsService');

async function analyzeTableStructure() {
  console.log('🔍 PAGEVIEWS_PARTITIONED TABLE ANALYSIS');
  console.log('='.repeat(80));
  
  try {
    // 1. Get table schema and column info
    console.log('📊 1. ANALYZING TABLE SCHEMA...');
    const columns = await prisma.$queryRaw`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'pageviews_partitioned' 
        AND TABLE_SCHEMA = 'preprocessed'
      ORDER BY ORDINAL_POSITION
    `;
    
    console.log(`✅ Found ${columns.length} columns:`);
    columns.slice(0, 15).forEach(col => {
      console.log(`   📝 ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.IS_NULLABLE === 'YES' ? ' (nullable)' : ''}`);
    });
    
    // 2. Check existing indexes
    console.log('\n🔑 2. ANALYZING INDEXES...');
    const indexes = await prisma.$queryRaw`
      SELECT 
        i.name as index_name,
        i.type_desc,
        c.name as column_name,
        ic.is_included_column
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      WHERE t.name = 'pageviews_partitioned'
      ORDER BY i.name, ic.key_ordinal
    `;
    
    console.log(`✅ Found ${indexes.length} index columns:`);
    const indexGroups = {};
    indexes.forEach(idx => {
      if (!indexGroups[idx.index_name]) {
        indexGroups[idx.index_name] = [];
      }
      indexGroups[idx.index_name].push(idx.column_name);
    });
    
    Object.keys(indexGroups).slice(0, 10).forEach(indexName => {
      console.log(`   🔑 ${indexName}: [${indexGroups[indexName].join(', ')}]`);
    });
    
    // 3. Data distribution analysis
    console.log('\n📈 3. ANALYZING DATA DISTRIBUTION...');
    
    // Check time range and distribution
    const timeStats = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_records,
        MIN(time) as min_time,
        MAX(time) as max_time,
        COUNT(DISTINCT td_client_id) as unique_visitors,
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno IS NOT NULL THEN td_client_id END) as booking_visitors,
        COUNT(DISTINCT CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as unique_days
      FROM preprocessed.pageviews_partitioned
      WHERE time IS NOT NULL
    `;
    
    const stats = timeStats[0];
    const minDate = new Date(Number(stats.min_time) * 1000).toISOString().split('T')[0];
    const maxDate = new Date(Number(stats.max_time) * 1000).toISOString().split('T')[0];
    
    console.log(`✅ Data Distribution:`);
    console.log(`   📊 Total records: ${Number(stats.total_records).toLocaleString()}`);
    console.log(`   📅 Date range: ${minDate} to ${maxDate}`);
    console.log(`   👥 Unique visitors: ${Number(stats.unique_visitors).toLocaleString()}`);
    console.log(`   🏨 Booking visitors: ${Number(stats.booking_visitors).toLocaleString()}`);
    console.log(`   📆 Days with data: ${Number(stats.unique_days).toLocaleString()}`);
    
    // 4. Channel data analysis
    console.log('\n🌐 4. ANALYZING CHANNEL DATA...');
    const channelStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN utm_source IS NOT NULL THEN 1 END) as utm_records,
        COUNT(CASE WHEN td_referrer IS NOT NULL THEN 1 END) as referrer_records,
        COUNT(CASE WHEN td_referrer IS NULL OR td_referrer = '' THEN 1 END) as direct_records,
        COUNT(DISTINCT utm_source) as unique_utm_sources,
        COUNT(*) as total_sample
      FROM preprocessed.pageviews_partitioned 
      WHERE time >= DATEDIFF(SECOND, '1970-01-01', DATEADD(DAY, -7, GETDATE()))
    `;
    
    const chStats = channelStats[0];
    console.log(`✅ Channel Data (last 7 days):`);
    console.log(`   🔗 UTM records: ${Number(chStats.utm_records).toLocaleString()}`);
    console.log(`   📄 Referrer records: ${Number(chStats.referrer_records).toLocaleString()}`);
    console.log(`   🎯 Direct records: ${Number(chStats.direct_records).toLocaleString()}`);
    console.log(`   🏷️ Unique UTM sources: ${Number(chStats.unique_utm_sources).toLocaleString()}`);
    
    // 5. Booking data analysis
    console.log('\n💰 5. ANALYZING BOOKING DATA...');
    const bookingStats = await prisma.$queryRaw`
      SELECT 
        COUNT(CASE WHEN booking_transaction_confirmationno IS NOT NULL THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN booking_bookingwidget_adultroom IS NOT NULL THEN 1 END) as room_selections,
        COUNT(CASE WHEN booking_transaction_total IS NOT NULL THEN 1 END) as revenue_records,
        COUNT(*) as total_sample
      FROM preprocessed.pageviews_partitioned 
      WHERE time >= DATEDIFF(SECOND, '1970-01-01', DATEADD(DAY, -7, GETDATE()))
    `;
    
    const bStats = bookingStats[0];
    console.log(`✅ Booking Data (last 7 days):`);
    console.log(`   ✅ Confirmed bookings: ${Number(bStats.confirmed_bookings).toLocaleString()}`);
    console.log(`   🏠 Room selections: ${Number(bStats.room_selections).toLocaleString()}`);
    console.log(`   💵 Revenue records: ${Number(bStats.revenue_records).toLocaleString()}`);
    
    // 6. Performance recommendations
    console.log('\n🚀 6. PERFORMANCE OPTIMIZATION RECOMMENDATIONS');
    console.log('='.repeat(80));
    
    const recordsPerDay = Number(stats.total_records) / Number(stats.unique_days);
    console.log(`📊 Average records per day: ${recordsPerDay.toLocaleString()}`);
    
    if (recordsPerDay > 100000) {
      console.log('🔴 HIGH VOLUME: Sampling strategy required for 4-5s responses');
      console.log('💡 Recommendation: Use TABLESAMPLE or date-based sampling');
    } else {
      console.log('🟢 MODERATE VOLUME: Direct queries should work with proper indexing');
    }
    
    console.log('\n📋 MISSING INDEXES ANALYSIS:');
    const hasTimeIndex = indexGroups['time'] || Object.values(indexGroups).some(cols => cols.includes('time'));
    const hasClientIndex = Object.values(indexGroups).some(cols => cols.includes('td_client_id'));
    
    if (!hasTimeIndex) {
      console.log('❌ Missing: Index on [time] - CRITICAL for date filtering');
    } else {
      console.log('✅ Found: Index includes [time] column');
    }
    
    if (!hasClientIndex) {
      console.log('❌ Missing: Index on [td_client_id] - Important for visitor counting');
    } else {
      console.log('✅ Found: Index includes [td_client_id] column');
    }
    
    console.log('\n🎯 OPTIMIZATION STRATEGIES FOR 4-5S RESPONSE:');
    console.log('1. 📊 Use TABLESAMPLE for large datasets');
    console.log('2. 🔍 Pre-filter with indexed columns first');
    console.log('3. 📅 Limit date ranges to reasonable periods');
    console.log('4. 🎲 Implement statistical sampling for accuracy');
    console.log('5. ⚡ Use parallel queries where possible');
    
    return {
      totalRecords: Number(stats.total_records),
      recordsPerDay,
      dateRange: { min: minDate, max: maxDate },
      hasTimeIndex,
      hasClientIndex
    };
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

// Quick performance test with sampling
async function testSamplingPerformance() {
  console.log('\n⚡ TESTING SAMPLING STRATEGIES');
  console.log('='.repeat(80));
  
  const testDate = '2025-07-01';
  const testTimestamp = Math.floor(new Date(testDate).getTime() / 1000);
  
  // Test 1: Full scan (current approach)
  console.log('🔍 Test 1: Full table scan...');
  const start1 = Date.now();
  const fullResult = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT td_client_id) as visitors
    FROM preprocessed.pageviews_partitioned
    WHERE time >= ${testTimestamp}
      AND time <= ${testTimestamp + 86400}
  `;
  const time1 = (Date.now() - start1) / 1000;
  console.log(`   ⏱️ Full scan: ${time1}s, visitors: ${fullResult[0].visitors}`);
  
  // Test 2: With TABLESAMPLE
  console.log('🎲 Test 2: TABLESAMPLE approach...');
  const start2 = Date.now();
  const sampleResult = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT td_client_id) * 10 as estimated_visitors
    FROM preprocessed.pageviews_partitioned TABLESAMPLE (10 PERCENT)
    WHERE time >= ${testTimestamp}
      AND time <= ${testTimestamp + 86400}
  `;
  const time2 = (Date.now() - start2) / 1000;
  console.log(`   ⏱️ Sample scan: ${time2}s, estimated visitors: ${sampleResult[0].estimated_visitors}`);
  
  const speedup = (time1 / time2).toFixed(1);
  console.log(`   🚀 Speedup: ${speedup}x faster with sampling`);
  
  return { fullTime: time1, sampleTime: time2, speedup };
}

// Run complete analysis
async function runCompleteAnalysis() {
  try {
    const structure = await analyzeTableStructure();
    const sampling = await testSamplingPerformance();
    
    console.log('\n✅ ANALYSIS COMPLETE!');
    console.log(`📊 Records: ${structure.totalRecords.toLocaleString()}`);
    console.log(`⚡ Sampling speedup: ${sampling.speedup}x`);
    console.log('🎯 Ready to implement 4-5s optimizations!');
    
  } catch (error) {
    console.error('💥 Analysis failed:', error);
  }
}

runCompleteAnalysis().catch(console.error);
