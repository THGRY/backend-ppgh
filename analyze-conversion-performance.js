// Analyze why Conversion API queries are so slow compared to metrics
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeConversionPerformance() {
  console.log('🔍 CONVERSION API PERFORMANCE ANALYSIS');
  console.log('=====================================\n');

  try {
    // Test date range (recent week)
    const fromDate = '2024-12-01';
    const toDate = '2024-12-07';
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    console.log(`📅 Test Range: ${fromDate} to ${toDate}`);
    console.log(`🕐 Timestamps: ${fromTimestamp} to ${toTimestamp}\n`);

    // 1. ANALYZE BASELINE: Simple visitor count (like 5-metrics)
    console.log('1. ⚡ BASELINE: Simple Visitor Count (600-900ms target)');
    let startTime = Date.now();
    const baseline = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    let endTime = Date.now();
    console.log(`✅ Result: ${Number(baseline[0].unique_visitors).toLocaleString()} visitors`);
    console.log(`⏱️  Time: ${endTime - startTime}ms\n`);

    // 2. ANALYZE SAMPLING IMPACT
    console.log('2. 📊 SAMPLING: Test different sampling rates');
    
    // 2a. With 1.5% sampling (current approach)
    startTime = Date.now();
    const sampled = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (1.5 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    endTime = Date.now();
    console.log(`   📈 1.5% Sample: ${Number(sampled[0].unique_visitors).toLocaleString()} visitors (${endTime - startTime}ms)`);

    // 2b. With 3% sampling
    startTime = Date.now();
    const sampled3 = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (3 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    endTime = Date.now();
    console.log(`   📈 3.0% Sample: ${Number(sampled3[0].unique_visitors).toLocaleString()} visitors (${endTime - startTime}ms)\n`);

    // 3. ANALYZE BOOKING DATA AVAILABILITY
    console.log('3. 💰 BOOKING DATA: Analyze conversion-specific fields');
    startTime = Date.now();
    const bookingData = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN booking_transaction_confirmationno IS NOT NULL THEN 1 END) as confirmations,
        COUNT(CASE WHEN booking_bookingwidget_arrivaldate IS NOT NULL THEN 1 END) as searches,
        COUNT(CASE WHEN booking_bookingwidget_adultroom IS NOT NULL THEN 1 END) as room_selections,
        COUNT(CASE WHEN booking_transaction_totalpayment IS NOT NULL THEN 1 END) as payments,
        COUNT(CASE WHEN td_path LIKE '%search%' THEN 1 END) as search_pages,
        COUNT(CASE WHEN td_path LIKE '%checkout%' THEN 1 END) as checkout_pages
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
    `;
    endTime = Date.now();
    const bData = bookingData[0];
    console.log(`✅ Booking Analysis (2% sample, ${endTime - startTime}ms):`);
    console.log(`   📊 Total records: ${Number(bData.total_records).toLocaleString()}`);
    console.log(`   ✅ Confirmations: ${Number(bData.confirmations).toLocaleString()}`);
    console.log(`   🔍 Searches: ${Number(bData.searches).toLocaleString()}`);
    console.log(`   🏠 Room selections: ${Number(bData.room_selections).toLocaleString()}`);
    console.log(`   💳 Payments: ${Number(bData.payments).toLocaleString()}`);
    console.log(`   📄 Search pages: ${Number(bData.search_pages).toLocaleString()}`);
    console.log(`   🛒 Checkout pages: ${Number(bData.checkout_pages).toLocaleString()}\n`);

    // 4. ANALYZE SIMPLE FUNNEL (no complex logic)
    console.log('4. 🎯 SIMPLE FUNNEL: Streamlined funnel without complex CTEs');
    startTime = Date.now();
    const simpleFunnel = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT td_client_id) as total_visitors,
        COUNT(DISTINCT CASE WHEN booking_bookingwidget_arrivaldate IS NOT NULL THEN td_client_id END) as search_users,
        COUNT(DISTINCT CASE WHEN booking_bookingwidget_adultroom IS NOT NULL THEN td_client_id END) as selection_users,
        COUNT(DISTINCT CASE WHEN booking_transaction_totalpayment IS NOT NULL THEN td_client_id END) as payment_users,
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno IS NOT NULL THEN td_client_id END) as confirmed_users
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
    `;
    endTime = Date.now();
    const sData = simpleFunnel[0];
    console.log(`✅ Simple Funnel (${endTime - startTime}ms):`);
    console.log(`   👥 Total Visitors: ${Number(sData.total_visitors).toLocaleString()}`);
    console.log(`   🔍 Search Users: ${Number(sData.search_users).toLocaleString()}`);
    console.log(`   🏠 Selection Users: ${Number(sData.selection_users).toLocaleString()}`);
    console.log(`   💳 Payment Users: ${Number(sData.payment_users).toLocaleString()}`);
    console.log(`   ✅ Confirmed Users: ${Number(sData.confirmed_users).toLocaleString()}\n`);

    // 5. ANALYZE REVENUE QUERY SIMPLIFIED
    console.log('5. 💵 REVENUE TRENDS: Simplified revenue analysis');
    startTime = Date.now();
    const revenueSimple = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT booking_transaction_confirmationno) as booking_count,
        SUM(TRY_CAST(booking_transaction_totalpayment AS FLOAT)) as total_revenue,
        AVG(TRY_CAST(booking_transaction_totalpayment AS FLOAT)) as avg_booking_value
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND booking_transaction_confirmationno IS NOT NULL
        AND booking_transaction_totalpayment IS NOT NULL
        AND TRY_CAST(booking_transaction_totalpayment AS FLOAT) > 0
    `;
    endTime = Date.now();
    const rData = revenueSimple[0];
    console.log(`✅ Simple Revenue (${endTime - startTime}ms):`);
    console.log(`   📊 Bookings: ${Number(rData.booking_count).toLocaleString()}`);
    console.log(`   💰 Revenue: $${Number(rData.total_revenue).toLocaleString()}`);
    console.log(`   📈 Avg Value: $${Number(rData.avg_booking_value).toFixed(2)}\n`);

    // 6. IDENTIFY THE BOTTLENECK
    console.log('6. 🚨 BOTTLENECK ANALYSIS');
    console.log('==========================');
    console.log('❌ PROBLEMS IN CURRENT CONVERSION QUERIES:');
    console.log('   1. Complex CTEs with multiple GROUP BY operations');
    console.log('   2. Multiple UNION ALL statements in revenue query');
    console.log('   3. Currency conversion joins (LEFT JOIN currencies)');
    console.log('   4. Complex CASE statements for funnel logic');
    console.log('   5. Date extension logic (6 months back for trends)');
    console.log('');
    console.log('✅ SOLUTION STRATEGY:');
    console.log('   1. Simplify to single aggregation queries like 5-metrics');
    console.log('   2. Remove complex CTEs and replace with direct aggregations');
    console.log('   3. Skip currency conversion (use raw amounts)');
    console.log('   4. Use simple conditional aggregations instead of CTEs');
    console.log('   5. Focus on current period only (no extended ranges)');

  } catch (error) {
    console.error('❌ Error in analysis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeConversionPerformance().catch(console.error);
