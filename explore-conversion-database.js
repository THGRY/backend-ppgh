// Deep exploration of database to understand actual conversion data availability
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exploreConversionDatabase() {
  console.log('🔍 DATABASE EXPLORATION FOR CONVERSION DATA');
  console.log('============================================\n');

  try {
    // Extended date range to ensure we find data
    const ranges = [
      { name: 'Last 30 days', days: 30 },
      { name: 'Last 90 days', days: 90 },
      { name: 'Last 180 days', days: 180 },
      { name: 'All of 2024', from: '2024-01-01', to: '2024-12-31' },
      { name: 'All of 2025', from: '2025-01-01', to: '2025-12-31' }
    ];

    for (const range of ranges) {
      console.log(`📅 EXPLORING: ${range.name}`);
      console.log('='.repeat(40));
      
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

      // 1. BASIC DATA AVAILABILITY
      console.log('1. 📊 BASIC DATA COUNTS');
      const basicCounts = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT td_client_id) as unique_users,
          MIN(time) as earliest_time,
          MAX(time) as latest_time
        FROM preprocessed.pageviews_partitioned
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const basic = basicCounts[0];
      console.log(`   📊 Total records: ${Number(basic.total_records).toLocaleString()}`);
      console.log(`   👥 Unique users: ${Number(basic.unique_users).toLocaleString()}`);
      
      if (Number(basic.total_records) === 0) {
        console.log('   ❌ NO DATA in this range\n');
        continue;
      }

      // 2. BOOKING CONFIRMATION FIELDS
      console.log('\n2. ✅ BOOKING CONFIRMATION ANALYSIS');
      const confirmationFields = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN booking_transaction_confirmationno IS NOT NULL AND booking_transaction_confirmationno != '' THEN 1 END) as confirmations_1,
          COUNT(CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL AND booking_transaction_confirmationno_1 != '' THEN 1 END) as confirmations_2,
          COUNT(CASE WHEN booking_transaction_confirmationno_2 IS NOT NULL AND booking_transaction_confirmationno_2 != '' THEN 1 END) as confirmations_3,
          COUNT(CASE WHEN booking_reservation_id IS NOT NULL AND booking_reservation_id != '' THEN 1 END) as reservations,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const conf = confirmationFields[0];
      console.log(`   ✅ Confirmation field 1: ${Number(conf.confirmations_1).toLocaleString()}`);
      console.log(`   ✅ Confirmation field 2: ${Number(conf.confirmations_2).toLocaleString()}`);
      console.log(`   ✅ Confirmation field 3: ${Number(conf.confirmations_3).toLocaleString()}`);
      console.log(`   🏨 Reservation IDs: ${Number(conf.reservations).toLocaleString()}`);
      console.log(`   📊 Sample size: ${Number(conf.total_sample).toLocaleString()}`);

      // 3. PAYMENT/REVENUE FIELDS
      console.log('\n3. 💰 PAYMENT/REVENUE ANALYSIS');
      const paymentFields = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN booking_transaction_totalpayment IS NOT NULL AND TRY_CAST(booking_transaction_totalpayment AS FLOAT) > 0 THEN 1 END) as payments_1,
          COUNT(CASE WHEN booking_transaction_totalpayment_1 IS NOT NULL AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0 THEN 1 END) as payments_2,
          COUNT(CASE WHEN booking_transaction_total IS NOT NULL AND TRY_CAST(booking_transaction_total AS FLOAT) > 0 THEN 1 END) as total_payments,
          SUM(TRY_CAST(booking_transaction_totalpayment AS FLOAT)) as revenue_sum_1,
          SUM(TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT)) as revenue_sum_2,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const pay = paymentFields[0];
      console.log(`   💳 Payment field 1: ${Number(pay.payments_1).toLocaleString()}`);
      console.log(`   💳 Payment field 2: ${Number(pay.payments_2).toLocaleString()}`);
      console.log(`   💰 Total payments: ${Number(pay.total_payments).toLocaleString()}`);
      console.log(`   💵 Revenue sum 1: $${Number(pay.revenue_sum_1 || 0).toLocaleString()}`);
      console.log(`   💵 Revenue sum 2: $${Number(pay.revenue_sum_2 || 0).toLocaleString()}`);

      // 4. BOOKING WIDGET FIELDS (for funnel stages)
      console.log('\n4. 🎯 BOOKING WIDGET/FUNNEL ANALYSIS');
      const widgetFields = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN booking_bookingwidget_arrivaldate IS NOT NULL THEN 1 END) as arrival_dates,
          COUNT(CASE WHEN booking_bookingwidget_adultroom IS NOT NULL THEN 1 END) as adult_rooms,
          COUNT(CASE WHEN booking_bookingwidget_departuredate IS NOT NULL THEN 1 END) as departure_dates,
          COUNT(CASE WHEN booking_guest_info_fullname IS NOT NULL THEN 1 END) as guest_names,
          COUNT(CASE WHEN booking_guest_info_email IS NOT NULL THEN 1 END) as guest_emails,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const widget = widgetFields[0];
      console.log(`   📅 Arrival dates: ${Number(widget.arrival_dates).toLocaleString()}`);
      console.log(`   🏠 Adult rooms: ${Number(widget.adult_rooms).toLocaleString()}`);
      console.log(`   📅 Departure dates: ${Number(widget.departure_dates).toLocaleString()}`);
      console.log(`   👤 Guest names: ${Number(widget.guest_names).toLocaleString()}`);
      console.log(`   📧 Guest emails: ${Number(widget.guest_emails).toLocaleString()}`);

      // 5. URL PATH ANALYSIS (for funnel stages)
      console.log('\n5. 🌐 URL PATH FUNNEL ANALYSIS');
      const pathAnalysis = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN td_path LIKE '%search%' THEN 1 END) as search_paths,
          COUNT(CASE WHEN td_path LIKE '%book%' THEN 1 END) as booking_paths,
          COUNT(CASE WHEN td_path LIKE '%guest%' THEN 1 END) as guest_paths,
          COUNT(CASE WHEN td_path LIKE '%checkout%' THEN 1 END) as checkout_paths,
          COUNT(CASE WHEN td_path LIKE '%confirm%' THEN 1 END) as confirm_paths,
          COUNT(CASE WHEN td_path LIKE '%payment%' THEN 1 END) as payment_paths,
          COUNT(*) as total_sample
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      const paths = pathAnalysis[0];
      console.log(`   🔍 Search paths: ${Number(paths.search_paths).toLocaleString()}`);
      console.log(`   📝 Booking paths: ${Number(paths.booking_paths).toLocaleString()}`);
      console.log(`   👤 Guest paths: ${Number(paths.guest_paths).toLocaleString()}`);
      console.log(`   🛒 Checkout paths: ${Number(paths.checkout_paths).toLocaleString()}`);
      console.log(`   ✅ Confirm paths: ${Number(paths.confirm_paths).toLocaleString()}`);
      console.log(`   💳 Payment paths: ${Number(paths.payment_paths).toLocaleString()}`);

      // 6. SAMPLE ACTUAL DATA
      if (Number(conf.confirmations_1) > 0 || Number(conf.confirmations_2) > 0) {
        console.log('\n6. 📋 SAMPLE ACTUAL BOOKING DATA');
        const sampleBookings = await prisma.$queryRaw`
          SELECT TOP 3
            booking_transaction_confirmationno,
            booking_transaction_confirmationno_1,
            booking_transaction_totalpayment,
            booking_transaction_totalpayment_1,
            booking_transaction_currencytype,
            td_path,
            time
          FROM preprocessed.pageviews_partitioned
          WHERE time >= ${fromTimestamp}
            AND time <= ${toTimestamp}
            AND (booking_transaction_confirmationno IS NOT NULL 
                 OR booking_transaction_confirmationno_1 IS NOT NULL)
          ORDER BY time DESC
        `;
        
        sampleBookings.forEach((booking, i) => {
          console.log(`   📋 Sample ${i + 1}:`);
          console.log(`      Confirmation: ${booking.booking_transaction_confirmationno || booking.booking_transaction_confirmationno_1}`);
          console.log(`      Payment: ${booking.booking_transaction_totalpayment || booking.booking_transaction_totalpayment_1}`);
          console.log(`      Currency: ${booking.booking_transaction_currencytype}`);
          console.log(`      Path: ${booking.td_path}`);
        });
      }

      console.log('\n' + '='.repeat(60) + '\n');
      
      // If we found good data, break early
      if (Number(conf.confirmations_1) > 0 || Number(conf.confirmations_2) > 0) {
        console.log('✅ FOUND CONVERSION DATA! Using this range for optimization.\n');
        break;
      }
    }

    // 7. PERFORMANCE BASELINE
    console.log('🚀 PERFORMANCE BASELINE TESTS');
    console.log('==============================');
    
    // Test simple visitor count (like 5-metrics)
    const testRange = { from: '2024-01-01', to: '2024-12-31' };
    const fromTimestamp = Math.floor(new Date(testRange.from).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(testRange.to).getTime() / 1000);
    
    console.log('\n1. ⚡ BASELINE: Simple visitor count');
    let startTime = Date.now();
    const baseline = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
    `;
    let endTime = Date.now();
    console.log(`   Result: ${Number(baseline[0].unique_visitors).toLocaleString()} visitors`);
    console.log(`   Time: ${endTime - startTime}ms`);

    console.log('\n2. ⚡ SIMPLE BOOKING COUNT');
    startTime = Date.now();
    const bookingCount = await prisma.$queryRaw`
      SELECT 
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno IS NOT NULL THEN booking_transaction_confirmationno END) +
        COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL THEN booking_transaction_confirmationno_1 END) as total_bookings
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
    `;
    endTime = Date.now();
    console.log(`   Result: ${Number(bookingCount[0].total_bookings).toLocaleString()} bookings`);
    console.log(`   Time: ${endTime - startTime}ms`);

    console.log('\n3. ⚡ SIMPLE REVENUE SUM');
    startTime = Date.now();
    const revenueSum = await prisma.$queryRaw`
      SELECT 
        SUM(TRY_CAST(booking_transaction_totalpayment AS FLOAT)) +
        SUM(TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT)) as total_revenue
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND (booking_transaction_totalpayment IS NOT NULL 
             OR booking_transaction_totalpayment_1 IS NOT NULL)
    `;
    endTime = Date.now();
    console.log(`   Result: $${Number(revenueSum[0].total_revenue || 0).toLocaleString()}`);
    console.log(`   Time: ${endTime - startTime}ms`);

  } catch (error) {
    console.error('❌ Error in database exploration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

exploreConversionDatabase().catch(console.error);
