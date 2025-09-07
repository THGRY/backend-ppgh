/**
 * Check what data exists in the pageviews table
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Checking what data exists in pageviews table...\n');
    
    // Check total record count
    const totalCount = await prisma.$queryRaw`
      SELECT COUNT(*) as total_records FROM pageviews
    `;
    console.log(`📊 Total records in pageviews: ${totalCount[0].total_records}`);
    
    // Check date range of data
    const dateRange = await prisma.$queryRaw`
      SELECT 
        MIN(time) as min_time,
        MAX(time) as max_time
      FROM pageviews 
      WHERE time IS NOT NULL
    `;
    
    if (dateRange[0].min_time && dateRange[0].max_time) {
      const minDate = new Date(Number(dateRange[0].min_time) * 1000);
      const maxDate = new Date(Number(dateRange[0].max_time) * 1000);
      console.log(`📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
    }
    
    // Check unique visitors sample
    const visitorSample = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM pageviews 
      WHERE td_client_id IS NOT NULL AND td_client_id != ''
    `;
    console.log(`👥 Total unique visitors in database: ${visitorSample[0].unique_visitors}`);
    
    // Check booking confirmations sample
    const bookingSample = await prisma.$queryRaw`
      SELECT COUNT(*) as booking_records
      FROM pageviews 
      WHERE booking_transaction_confirmationno IS NOT NULL 
         OR booking_transaction_confirmationno_1 IS NOT NULL
    `;
    console.log(`🏨 Records with booking confirmations: ${bookingSample[0].booking_records}`);
    
    // Let's test with the actual date range
    if (dateRange[0].min_time && dateRange[0].max_time) {
      console.log('\n🧪 Testing with actual data range...');
      
      const actualFromTimestamp = Number(dateRange[0].min_time);
      const actualToTimestamp = Number(dateRange[0].max_time);
      
      // Test unique visitors with actual range
      const actualVisitors = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT td_client_id) as unique_visitors
        FROM pageviews
        WHERE time >= ${actualFromTimestamp}
          AND time <= ${actualToTimestamp}
          AND td_client_id IS NOT NULL
          AND td_client_id != ''
      `;
      
      // Test bookings with actual range
      const actualBookings = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT confirmation_no) as total_bookings
        FROM (
            SELECT booking_transaction_confirmationno as confirmation_no
            FROM pageviews
            WHERE time >= ${actualFromTimestamp}
              AND time <= ${actualToTimestamp}
              AND booking_transaction_confirmationno IS NOT NULL
              AND booking_transaction_confirmationno != ''

            UNION

            SELECT booking_transaction_confirmationno_1 as confirmation_no
            FROM pageviews
            WHERE time >= ${actualFromTimestamp}
              AND time <= ${actualToTimestamp}
              AND booking_transaction_confirmationno_1 IS NOT NULL
              AND booking_transaction_confirmationno_1 != ''
        ) as all_confirmations
      `;
      
      console.log(`✅ Unique visitors (actual range): ${actualVisitors[0].unique_visitors}`);
      console.log(`✅ Total bookings (actual range): ${actualBookings[0].total_bookings}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData().catch(console.error);
