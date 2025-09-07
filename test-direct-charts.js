// Direct chart testing without caching to measure real SQL performance
const l1Service = require('./src/services/l1MetricsService');

async function testDirectChartQueries() {
  console.log('🔍 Testing Direct Chart SQL Performance...\n');
  
  try {
    await l1Service.initializePrisma();
    const prisma = l1Service.prisma;
    
    // Test 1: Awareness & Engagement - Channel Analysis
    console.log('📊 CHART 1: Unique Visitors by Channel');
    console.log('=====================================');
    
    const testRanges = [
      { name: 'Week 1 Jan 2025', from: '2025-01-01', to: '2025-01-07' },
      { name: 'Week 2 Jan 2025', from: '2025-01-08', to: '2025-01-14' },
      { name: 'Week 1 Dec 2024', from: '2024-12-01', to: '2024-12-07' },
      { name: '20 Days Jan 2025', from: '2025-01-01', to: '2025-01-20' },
      { name: 'Full Jan 2025', from: '2025-01-01', to: '2025-01-31' }
    ];
    
    for (const range of testRanges) {
      console.log(`\n🕐 Testing: ${range.name} (${range.from} to ${range.to})`);
      
      const fromTimestamp = Math.floor(new Date(range.from).getTime() / 1000);
      const toTimestamp = Math.floor(new Date(range.to).getTime() / 1000);
      
      const startTime = Date.now();
      
      // Direct SQL query for channel analysis (simplified version)
      const result = await prisma.$queryRaw`
        WITH channel_data AS (
          SELECT
            td_client_id,
            CASE
              WHEN utm_source LIKE '%google%' THEN 'Paid Search'
              WHEN utm_source LIKE '%facebook%' THEN 'Social Media'  
              WHEN utm_source LIKE '%email%' THEN 'Email'
              WHEN utm_source IS NOT NULL THEN 'UTM Campaign'
              WHEN td_referrer LIKE '%google.com%' THEN 'Organic Search'
              WHEN td_referrer LIKE '%facebook.com%' THEN 'Social Media'
              WHEN td_referrer IS NULL OR td_referrer = '' THEN 'Direct'
              ELSE 'Other'
            END as channel
          FROM preprocessed.pageviews_partitioned TABLESAMPLE (1 PERCENT)
          WHERE time >= ${fromTimestamp} 
            AND time <= ${toTimestamp}
            AND td_client_id IS NOT NULL
        ),
        channel_counts AS (
          SELECT 
            channel,
            COUNT(DISTINCT td_client_id) * 100 as visitors
          FROM channel_data
          GROUP BY channel
        )
        SELECT TOP 5
          channel,
          visitors
        FROM channel_counts
        WHERE visitors > 0
        ORDER BY visitors DESC
      `;
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      console.log(`  ⏱️  SQL Time: ${queryTime}ms`);
      console.log(`  📊 Top Channels:`);
      result.forEach(row => {
        console.log(`    ${row.channel}: ${Number(row.visitors).toLocaleString()} visitors`);
      });
    }
    
    // Test 2: Large range performance test
    console.log('\n\n📊 PERFORMANCE STRESS TEST');
    console.log('=========================');
    
    const largeRanges = [
      { name: '3 Months', from: '2024-11-01', to: '2025-01-31' },
      { name: '6 Months', from: '2024-08-01', to: '2025-01-31' }
    ];
    
    for (const range of largeRanges) {
      console.log(`\n🚀 Testing: ${range.name} (${range.from} to ${range.to})`);
      
      const fromTimestamp = Math.floor(new Date(range.from).getTime() / 1000);
      const toTimestamp = Math.floor(new Date(range.to).getTime() / 1000);
      
      const startTime = Date.now();
      
      // Simple visitor count for large ranges
      const result = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT td_client_id) as total_visitors
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (0.5 PERCENT)
        WHERE time >= ${fromTimestamp} 
          AND time <= ${toTimestamp}
          AND td_client_id IS NOT NULL
      `;
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;
      
      console.log(`  ⏱️  SQL Time: ${queryTime}ms`);
      console.log(`  👥 Total Visitors: ${Number(result[0].total_visitors * 200).toLocaleString()}`);
      
      // Performance classification
      if (queryTime < 1000) {
        console.log(`  ✅ FAST`);
      } else if (queryTime < 5000) {
        console.log(`  ⚠️  MODERATE`);
      } else {
        console.log(`  🐌 SLOW`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testDirectChartQueries();
