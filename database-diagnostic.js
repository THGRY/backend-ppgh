/**
 * DATABASE DIAGNOSTIC - Check table growth and statistics
 * 
 * Quick diagnostic to confirm if data volume increase is causing the slowdown
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runDatabaseDiagnostic() {
  console.log('🩺 DATABASE DIAGNOSTIC: Table Growth Analysis');
  console.log('============================================\n');

  try {
    // Test 1: Check table record count
    console.log('📊 TEST 1: Table Size Check');
    console.log('---------------------------');
    
    const startTime = Date.now();
    const recordCount = await prisma.$queryRaw`
      SELECT COUNT(*) as total_records
      FROM preprocessed.pageviews_partitioned
    `;
    const countTime = Date.now() - startTime;
    
    const totalRecords = Number(recordCount[0].total_records);
    console.log(`  Total Records: ${totalRecords.toLocaleString()}`);
    console.log(`  Count Query Time: ${countTime}ms`);
    
    if (countTime > 5000) {
      console.log('  ⚠️  WARNING: Simple COUNT query is slow - indicates table size issue');
    } else {
      console.log('  ✅ Count query performance acceptable');
    }

    // Test 2: Check data distribution by time
    console.log('\n📅 TEST 2: Data Distribution Check');
    console.log('----------------------------------');
    
    const dataDistribution = await prisma.$queryRaw`
      SELECT 
        YEAR(DATEADD(second, time, '1970-01-01')) as year,
        MONTH(DATEADD(second, time, '1970-01-01')) as month,
        COUNT(*) as record_count
      FROM preprocessed.pageviews_partitioned
      WHERE time IS NOT NULL
      GROUP BY YEAR(DATEADD(second, time, '1970-01-01')), MONTH(DATEADD(second, time, '1970-01-01'))
      ORDER BY year DESC, month DESC
    `;

    console.log('  Recent Data Distribution:');
    dataDistribution.slice(0, 12).forEach(row => {
      const recordCount = Number(row.record_count);
      console.log(`    ${row.year}-${String(row.month).padStart(2, '0')}: ${recordCount.toLocaleString()} records`);
    });

    // Test 3: Check 2025 data specifically
    console.log('\n🎯 TEST 3: 2025 Data Volume (Your Focus Period)');
    console.log('-----------------------------------------------');
    
    const year2025Data = await prisma.$queryRaw`
      SELECT COUNT(*) as records_2025
      FROM preprocessed.pageviews_partitioned
      WHERE time >= 1735689600  -- 2025-01-01 00:00:00 UTC
        AND time <= 1743465599  -- 2025-07-31 23:59:59 UTC
    `;
    
    const records2025 = Number(year2025Data[0].records_2025);
    console.log(`  2025 Data (Jan-Jul): ${records2025.toLocaleString()} records`);
    
    // Calculate percentage of total data
    const percentage2025 = ((records2025 / totalRecords) * 100).toFixed(1);
    console.log(`  Percentage of Total: ${percentage2025}%`);
    
    if (percentage2025 > 50) {
      console.log('  🚨 CRITICAL: 2025 data represents majority of the table!');
      console.log('  💡 This suggests recent massive data addition');
    } else if (percentage2025 > 20) {
      console.log('  ⚠️  WARNING: 2025 data is a significant portion of the table');
    } else {
      console.log('  ✅ 2025 data proportion seems normal');
    }

    // Test 4: Simple performance test on 2025 data
    console.log('\n⚡ TEST 4: 2025 Query Performance Test');
    console.log('-------------------------------------');
    
    const perfTestStart = Date.now();
    const sampleQuery = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= 1719792000  -- 2024-07-01
        AND time <= 1719878399  -- 2024-07-01 + 1 day
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    const perfTestTime = Date.now() - perfTestStart;
    
    const sampleVisitors = Number(sampleQuery[0].unique_visitors);
    console.log(`  1-Day Query (Jul 1, 2024): ${perfTestTime}ms`);
    console.log(`  Result: ${sampleVisitors.toLocaleString()} unique visitors`);
    
    if (perfTestTime > 2000) {
      console.log('  🚨 CRITICAL: Even 1-day queries are slow!');
    } else if (perfTestTime > 500) {
      console.log('  ⚠️  WARNING: 1-day queries slower than expected');
    } else {
      console.log('  ✅ 1-day query performance acceptable');
    }

    // Test 5: Index usage check
    console.log('\n🗄️  TEST 5: Index Information');
    console.log('-----------------------------');
    
    try {
      const indexInfo = await prisma.$queryRaw`
        SELECT 
          i.name as index_name,
          i.type_desc as index_type,
          s.user_seeks,
          s.user_scans,
          s.user_lookups,
          s.user_updates
        FROM sys.indexes i
        LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
        INNER JOIN sys.objects o ON i.object_id = o.object_id
        INNER JOIN sys.schemas sc ON o.schema_id = sc.schema_id
        WHERE o.name = 'pageviews_partitioned' AND sc.name = 'preprocessed'
      `;

      console.log('  Available Indexes:');
      indexInfo.forEach(idx => {
        const seekRatio = idx.user_seeks && idx.user_scans ? 
          (idx.user_seeks / (idx.user_seeks + idx.user_scans) * 100).toFixed(1) : 'N/A';
        console.log(`    ${idx.index_name}: ${idx.index_type} (Seek Ratio: ${seekRatio}%)`);
      });

    } catch (indexError) {
      console.log('  ⚠️  Could not retrieve index information (insufficient permissions)');
    }

    // Summary and recommendations
    console.log('\n🎯 DIAGNOSTIC SUMMARY');
    console.log('====================');
    
    console.log('\n📊 Key Findings:');
    console.log(`  • Total table size: ${totalRecords.toLocaleString()} records`);
    console.log(`  • 2025 data volume: ${records2025.toLocaleString()} records (${percentage2025}%)`);
    console.log(`  • Count query time: ${countTime}ms`);
    console.log(`  • Sample query time: ${perfTestTime}ms`);

    console.log('\n💡 Recommended Actions:');
    if (countTime > 10000 || perfTestTime > 2000) {
      console.log('  🚨 URGENT: Database performance is severely degraded');
      console.log('  1. UPDATE STATISTICS preprocessed.pageviews_partitioned');
      console.log('  2. Check and rebuild indexes if fragmented');
      console.log('  3. Consider table partitioning by date if not already done');
    } else if (percentage2025 > 30) {
      console.log('  ⚠️  Recent data growth detected');
      console.log('  1. Update table statistics to reflect new data patterns');
      console.log('  2. Review index strategies for current data volume');
    } else {
      console.log('  ✅ Database health appears good - investigate other factors');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runDatabaseDiagnostic().catch(console.error);
