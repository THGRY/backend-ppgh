// Test actual booking data availability with correct column names
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBookingData() {
  console.log('🔍 TESTING ACTUAL BOOKING DATA AVAILABILITY');
  console.log('===========================================\n');

  try {
    // Test different time ranges to find where data exists
    const ranges = [
      { name: 'Last 7 days', days: 7 },
      { name: 'Last 30 days', days: 30 },
      { name: 'Last 90 days', days: 90 },
      { name: 'Year 2024', from: '2024-01-01', to: '2024-12-31' },
      { name: 'Year 2025', from: '2025-01-01', to: '2025-12-31' }
    ];

    for (const range of ranges) {
      console.log(`📅 TESTING: ${range.name}`);
      console.log('='.repeat(30));
      
      let fromTimestamp, toTimestamp;
      if (range.days) {
        const toDate = new Date();
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - range.days);
        fromTimestamp = Math.floor(fromDate.getTime() / 1000);
        toTimestamp = Math.floor(toDate.getTime() / 1000);
      } else {
        fromTimestamp = Math.floor(new Date(range.from).getTime() / 1000);
        toTimestamp = Math.floor(new Date(range.to).getTime() / 1000);
      }

      // 1. Basic data check
      const basicData = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT td_client_id) as unique_users
        FROM preprocessed.pageviews_partitioned
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const basic = basicData[0];
      console.log(`📊 Total records: ${Number(basic.total_records).toLocaleString()}`);
      console.log(`👥 Unique users: ${Number(basic.unique_users).toLocaleString()}`);
      
      if (Number(basic.total_records) === 0) {
        console.log('❌ NO DATA in this range\n');
        continue;
      }

      // 2. Test booking confirmation data (using correct column names)
      console.log('\n✅ BOOKING CONFIRMATIONS:');
      const confirmations = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN booking_transaction_confirmationno IS NOT NULL 
                      AND booking_transaction_confirmationno != '' THEN 1 END) as confirmations_1,
          COUNT(CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL 
                      AND booking_transaction_confirmationno_1 != '' THEN 1 END) as confirmations_2,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const conf = confirmations[0];
      console.log(`   📋 Confirmation field 1: ${Number(conf.confirmations_1).toLocaleString()}`);
      console.log(`   📋 Confirmation field 2: ${Number(conf.confirmations_2).toLocaleString()}`);
      console.log(`   📊 Sample size: ${Number(conf.total_sample).toLocaleString()}`);

      // 3. Test payment data
      console.log('\n💰 PAYMENT DATA:');
      const payments = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN booking_transaction_totalpayment IS NOT NULL 
                      AND booking_transaction_totalpayment != '' 
                      AND TRY_CAST(booking_transaction_totalpayment AS FLOAT) > 0 THEN 1 END) as payments_1,
          COUNT(CASE WHEN booking_transaction_totalpayment_1 IS NOT NULL 
                      AND booking_transaction_totalpayment_1 != '' 
                      AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0 THEN 1 END) as payments_2,
          SUM(TRY_CAST(booking_transaction_totalpayment AS FLOAT)) as revenue_1,
          SUM(TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT)) as revenue_2,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const pay = payments[0];
      console.log(`   💳 Payment field 1: ${Number(pay.payments_1).toLocaleString()}`);
      console.log(`   💳 Payment field 2: ${Number(pay.payments_2).toLocaleString()}`);
      console.log(`   💵 Revenue 1: $${Number(pay.revenue_1 || 0).toLocaleString()}`);
      console.log(`   💵 Revenue 2: $${Number(pay.revenue_2 || 0).toLocaleString()}`);

      // 4. Test funnel data (booking widget fields)
      console.log('\n🎯 FUNNEL DATA (Booking Widget):');
      const funnel = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN booking_bookingwidget_arrivaldate IS NOT NULL 
                      AND booking_bookingwidget_arrivaldate != '' THEN 1 END) as arrival_dates_1,
          COUNT(CASE WHEN booking_bookingwidget_arrivaldate_1 IS NOT NULL 
                      AND booking_bookingwidget_arrivaldate_1 != '' THEN 1 END) as arrival_dates_2,
          COUNT(CASE WHEN booking_bookingwidget_adultroom IS NOT NULL 
                      AND booking_bookingwidget_adultroom != '' THEN 1 END) as adult_rooms_1,
          COUNT(CASE WHEN booking_bookingwidget_adultroom_1 IS NOT NULL 
                      AND booking_bookingwidget_adultroom_1 != '' THEN 1 END) as adult_rooms_2,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const funnelData = funnel[0];
      console.log(`   📅 Arrival dates 1: ${Number(funnelData.arrival_dates_1).toLocaleString()}`);
      console.log(`   📅 Arrival dates 2: ${Number(funnelData.arrival_dates_2).toLocaleString()}`);
      console.log(`   🏠 Adult rooms 1: ${Number(funnelData.adult_rooms_1).toLocaleString()}`);
      console.log(`   🏠 Adult rooms 2: ${Number(funnelData.adult_rooms_2).toLocaleString()}`);

      // 5. Test URL path funnel data
      console.log('\n🌐 PATH FUNNEL DATA:');
      const paths = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN td_path LIKE '%search%' THEN 1 END) as search_paths,
          COUNT(CASE WHEN td_path LIKE '%book%' THEN 1 END) as booking_paths,
          COUNT(CASE WHEN td_path LIKE '%guest%' THEN 1 END) as guest_paths,
          COUNT(CASE WHEN td_path LIKE '%checkout%' THEN 1 END) as checkout_paths,
          COUNT(CASE WHEN td_path LIKE '%confirm%' THEN 1 END) as confirm_paths,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const pathData = paths[0];
      console.log(`   🔍 Search paths: ${Number(pathData.search_paths).toLocaleString()}`);
      console.log(`   📝 Booking paths: ${Number(pathData.booking_paths).toLocaleString()}`);
      console.log(`   👤 Guest paths: ${Number(pathData.guest_paths).toLocaleString()}`);
      console.log(`   🛒 Checkout paths: ${Number(pathData.checkout_paths).toLocaleString()}`);
      console.log(`   ✅ Confirm paths: ${Number(pathData.confirm_paths).toLocaleString()}`);

      // 6. If we found booking data, show samples
      const totalConfirmations = Number(conf.confirmations_1) + Number(conf.confirmations_2);
      if (totalConfirmations > 0) {
        console.log('\n📋 SAMPLE BOOKING DATA:');
        const samples = await prisma.$queryRaw`
          SELECT TOP 3
            booking_transaction_confirmationno,
            booking_transaction_confirmationno_1,
            booking_transaction_totalpayment,
            booking_transaction_totalpayment_1,
            booking_transaction_currencytype,
            booking_transaction_currencytype_1,
            td_path,
            time
          FROM preprocessed.pageviews_partitioned
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
            AND (booking_transaction_confirmationno IS NOT NULL 
                 OR booking_transaction_confirmationno_1 IS NOT NULL)
          ORDER BY time DESC
        `;
        
        samples.forEach((sample, i) => {
          console.log(`   🎫 Sample ${i + 1}:`);
          console.log(`      Confirmation: ${sample.booking_transaction_confirmationno || sample.booking_transaction_confirmationno_1}`);
          console.log(`      Payment: ${sample.booking_transaction_totalpayment || sample.booking_transaction_totalpayment_1}`);
          console.log(`      Currency: ${sample.booking_transaction_currencytype || sample.booking_transaction_currencytype_1}`);
          console.log(`      Path: ${sample.td_path}`);
        });
      }

      console.log('\n' + '='.repeat(50) + '\n');
      
      // If we found good data, test fast queries
      if (totalConfirmations > 0) {
        console.log('🚀 TESTING FAST QUERY PATTERNS');
        console.log('==============================');
        
        // Test 1: Simple booking count (like 5-metrics style)
        console.log('\n1. ⚡ Simple Booking Count:');
        let startTime = Date.now();
        const bookingCount = await prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno IS NOT NULL 
                                 AND booking_transaction_confirmationno != '' 
                                 THEN booking_transaction_confirmationno END) +
            COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL 
                                 AND booking_transaction_confirmationno_1 != '' 
                                 THEN booking_transaction_confirmationno_1 END) as total_bookings
          FROM preprocessed.pageviews_partitioned
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
        `;
        let endTime = Date.now();
        console.log(`   Result: ${Number(bookingCount[0].total_bookings).toLocaleString()} bookings`);
        console.log(`   Time: ${endTime - startTime}ms`);

        // Test 2: Simple funnel stages (fast approach)
        console.log('\n2. ⚡ Simple Funnel Count:');
        startTime = Date.now();
        const funnelCount = await prisma.$queryRaw`
          SELECT 
            COUNT(DISTINCT td_client_id) as total_visitors,
            COUNT(DISTINCT CASE WHEN booking_bookingwidget_arrivaldate IS NOT NULL 
                                 OR booking_bookingwidget_arrivaldate_1 IS NOT NULL 
                                 THEN td_client_id END) as search_users,
            COUNT(DISTINCT CASE WHEN booking_bookingwidget_adultroom IS NOT NULL 
                                 OR booking_bookingwidget_adultroom_1 IS NOT NULL 
                                 THEN td_client_id END) as selection_users,
            COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno IS NOT NULL 
                                 OR booking_transaction_confirmationno_1 IS NOT NULL 
                                 THEN td_client_id END) as confirmed_users
          FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
            AND td_client_id IS NOT NULL
        `;
        endTime = Date.now();
        const fResult = funnelCount[0];
        console.log(`   Visitors: ${Number(fResult.total_visitors).toLocaleString()}`);
        console.log(`   Search: ${Number(fResult.search_users).toLocaleString()}`);
        console.log(`   Selection: ${Number(fResult.selection_users).toLocaleString()}`);
        console.log(`   Confirmed: ${Number(fResult.confirmed_users).toLocaleString()}`);
        console.log(`   Time: ${endTime - startTime}ms`);
        
        break; // Found good data, no need to test other ranges
      }
    }

  } catch (error) {
    console.error('❌ Error testing booking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testBookingData().catch(console.error);
