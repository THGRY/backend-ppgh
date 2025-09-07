/**
 * Check the correct table: preprocessed.pageviews_partitioned
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCorrectTable() {
  try {
    console.log('🔍 Checking preprocessed.pageviews_partitioned...\n');
    
    // Check record count
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as record_count 
      FROM preprocessed.pageviews_partitioned
    `;
    console.log(`📊 Records in preprocessed.pageviews_partitioned: ${count[0].record_count}`);
    
    if (Number(count[0].record_count) > 0) {
      // Check date range
      const dateRange = await prisma.$queryRaw`
        SELECT 
          MIN(time) as min_time,
          MAX(time) as max_time
        FROM preprocessed.pageviews_partitioned 
        WHERE time IS NOT NULL
      `;
      
      if (dateRange[0].min_time && dateRange[0].max_time) {
        const minDate = new Date(Number(dateRange[0].min_time) * 1000);
        const maxDate = new Date(Number(dateRange[0].max_time) * 1000);
        console.log(`📅 Date range: ${minDate.toISOString().split('T')[0]} to ${maxDate.toISOString().split('T')[0]}`);
      }
      
      // Check unique visitors
      const visitors = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT td_client_id) as unique_visitors
        FROM preprocessed.pageviews_partitioned 
        WHERE td_client_id IS NOT NULL AND td_client_id != ''
      `;
      console.log(`👥 Total unique visitors: ${visitors[0].unique_visitors}`);
      
      // Check bookings
      const bookings = await prisma.$queryRaw`
        SELECT COUNT(*) as booking_records
        FROM preprocessed.pageviews_partitioned 
        WHERE booking_transaction_confirmationno IS NOT NULL 
           OR booking_transaction_confirmationno_1 IS NOT NULL
      `;
      console.log(`🏨 Records with booking confirmations: ${bookings[0].booking_records}`);
      
      // Sample data
      const sample = await prisma.$queryRaw`
        SELECT TOP 3 
          time,
          td_client_id,
          booking_transaction_confirmationno,
          booking_transaction_confirmationno_1
        FROM preprocessed.pageviews_partitioned
        WHERE td_client_id IS NOT NULL
      `;
      
      console.log('\n📋 Sample data:');
      sample.forEach((row, i) => {
        const date = new Date(Number(row.time) * 1000).toISOString().split('T')[0];
        console.log(`${i+1}. date: ${date}, client_id: ${row.td_client_id}, booking1: ${row.booking_transaction_confirmationno || 'null'}, booking2: ${row.booking_transaction_confirmationno_1 || 'null'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCorrectTable().catch(console.error);
