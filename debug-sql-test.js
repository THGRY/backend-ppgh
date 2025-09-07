const { PrismaClient } = require('@prisma/client');

async function testDirectSQL() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  try {
    console.log('🔍 Testing direct SQL queries to bypass caching...\n');

    // Test 1: Week 1 (Jan 1-7)
    const fromTimestamp1 = Math.floor(new Date('2025-01-01').getTime() / 1000);
    const toTimestamp1 = Math.floor(new Date('2025-01-07').getTime() / 1000);
    
    console.log(`📅 Week 1: ${fromTimestamp1} to ${toTimestamp1}`);
    const result1 = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp1}
        AND time <= ${toTimestamp1}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    console.log(`✅ Week 1 Unique Visitors: ${Number(result1[0].unique_visitors)}\n`);

    // Test 2: Week 2 (Jan 8-14)
    const fromTimestamp2 = Math.floor(new Date('2025-01-08').getTime() / 1000);
    const toTimestamp2 = Math.floor(new Date('2025-01-14').getTime() / 1000);
    
    console.log(`📅 Week 2: ${fromTimestamp2} to ${toTimestamp2}`);
    const result2 = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp2}
        AND time <= ${toTimestamp2}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    console.log(`✅ Week 2 Unique Visitors: ${Number(result2[0].unique_visitors)}\n`);

    // Test 3: Single day (Jan 1)
    const fromTimestamp3 = Math.floor(new Date('2025-01-01').getTime() / 1000);
    const toTimestamp3 = Math.floor(new Date('2025-01-01 23:59:59').getTime() / 1000);
    
    console.log(`📅 Single Day (Jan 1): ${fromTimestamp3} to ${toTimestamp3}`);
    const result3 = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp3}
        AND time <= ${toTimestamp3}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    console.log(`✅ Jan 1 Only Unique Visitors: ${Number(result3[0].unique_visitors)}\n`);

    // Test 4: Check actual timestamps in the data
    console.log('🔍 Checking actual timestamp distribution...');
    const timestampCheck = await prisma.$queryRaw`
      SELECT TOP 10
        time,
        DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') as readable_date,
        td_client_id
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp1}
        AND time <= ${toTimestamp2}
        AND td_client_id IS NOT NULL
      ORDER BY time
    `;
    console.log('📊 Sample timestamp data:');
    timestampCheck.forEach(row => {
      console.log(`   ${row.time} -> ${row.readable_date} (client: ${row.td_client_id?.substring(0,10)}...)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectSQL();
