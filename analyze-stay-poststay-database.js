const { PrismaClient } = require('@prisma/client');

async function analyzeStayPostStayData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 ANALYZING STAY & POST-STAY DATA AVAILABILITY');
    console.log('===============================================');
    
    // Check booking confirmation data availability
    console.log('\n📊 1. BOOKING CONFIRMATION DATA:');
    
    const confirmationQuery = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(booking_transaction_confirmationno) as confirmationno_count,
        COUNT(booking_transaction_confirmationno_1) as confirmationno_1_count,
        COUNT(DISTINCT td_client_id) as unique_clients
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (1 PERCENT)
      WHERE time >= 1701388800 -- Last 90 days sample
        AND booking_transaction_confirmationno_1 IS NOT NULL
        AND booking_transaction_confirmationno_1 != ''
    `;
    
    console.log('  Confirmation Data (1% sample):');
    console.log(`    • Total rows: ${confirmationQuery[0].total_rows}`);
    console.log(`    • confirmationno field: ${confirmationQuery[0].confirmationno_count}`);
    console.log(`    • confirmationno_1 field: ${confirmationQuery[0].confirmationno_1_count}`);
    console.log(`    • Unique clients: ${confirmationQuery[0].unique_clients}`);
    
    // Check what fields exist for customer retention analysis
    console.log('\n📊 2. CUSTOMER RETENTION DATA:');
    
    const retentionQuery = await prisma.$queryRaw`
      WITH customer_bookings AS (
        SELECT 
          td_client_id,
          COUNT(DISTINCT booking_transaction_confirmationno_1) as booking_count,
          MIN(time) as first_booking,
          MAX(time) as last_booking
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (1 PERCENT)
        WHERE time >= 1701388800 -- Last 90 days sample
          AND booking_transaction_confirmationno_1 IS NOT NULL
          AND booking_transaction_confirmationno_1 != ''
          AND td_client_id IS NOT NULL
          AND td_client_id != ''
        GROUP BY td_client_id
        HAVING COUNT(DISTINCT booking_transaction_confirmationno_1) >= 1
      )
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN booking_count > 1 THEN 1 END) as repeat_customers,
        AVG(booking_count) as avg_bookings_per_customer,
        ROUND((COUNT(CASE WHEN booking_count > 1 THEN 1 END) * 100.0 / COUNT(*)), 2) as repeat_rate_percentage
      FROM customer_bookings
    `;
    
    console.log('  Customer Retention (1% sample):');
    console.log(`    • Total customers: ${retentionQuery[0].total_customers}`);
    console.log(`    • Repeat customers: ${retentionQuery[0].repeat_customers}`);
    console.log(`    • Avg bookings per customer: ${Number(retentionQuery[0].avg_bookings_per_customer).toFixed(2)}`);
    console.log(`    • Repeat rate: ${retentionQuery[0].repeat_rate_percentage}%`);
    
    // Test simple fast query performance
    console.log('\n⚡ 3. FAST QUERY PERFORMANCE TEST:');
    
    const startTime = Date.now();
    const fastTest = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT td_client_id) * 50 as estimated_total_customers,
        COUNT(DISTINCT booking_transaction_confirmationno_1) * 50 as estimated_bookings,
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL THEN td_client_id END) * 50 as estimated_booking_customers
      FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
      WHERE time >= 1733011200 -- Dec 1, 2024
        AND time <= 1735689599 -- Dec 31, 2024
        AND td_client_id IS NOT NULL
    `;
    const queryTime = Date.now() - startTime;
    
    console.log(`  Simple Query Performance: ${queryTime}ms`);
    console.log(`    • Estimated total customers: ${fastTest[0].estimated_total_customers}`);
    console.log(`    • Estimated bookings: ${fastTest[0].estimated_bookings}`);
    console.log(`    • Estimated booking customers: ${fastTest[0].estimated_booking_customers}`);
    
    console.log('\n✅ ANALYSIS COMPLETE - Ready for optimization!');
    
  } catch (error) {
    console.error('❌ Error analyzing stay/post-stay data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeStayPostStayData();
