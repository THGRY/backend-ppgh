// Check what booking-related columns actually exist in the database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBookingColumns() {
  console.log('🔍 CHECKING ACTUAL BOOKING COLUMNS IN DATABASE');
  console.log('===============================================\n');

  try {
    // Get table schema to see all columns
    console.log('📊 Getting table schema for pageviews_partitioned...\n');
    
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'pageviews_partitioned'
        AND TABLE_SCHEMA = 'preprocessed'
        AND COLUMN_NAME LIKE '%booking%'
      ORDER BY COLUMN_NAME
    `;
    
    console.log('📋 BOOKING-RELATED COLUMNS FOUND:');
    console.log('==================================');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'Nullable' : 'Not Null'}`);
    });
    
    // Also check for transaction, confirmation, payment related columns
    console.log('\n💰 TRANSACTION/PAYMENT COLUMNS:');
    console.log('================================');
    const transactionColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'pageviews_partitioned'
        AND TABLE_SCHEMA = 'preprocessed'
        AND (COLUMN_NAME LIKE '%transaction%' 
             OR COLUMN_NAME LIKE '%payment%' 
             OR COLUMN_NAME LIKE '%confirmation%'
             OR COLUMN_NAME LIKE '%revenue%'
             OR COLUMN_NAME LIKE '%total%')
      ORDER BY COLUMN_NAME
    `;
    
    transactionColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'Nullable' : 'Not Null'}`);
    });

    // Check for guest/user related columns
    console.log('\n👤 GUEST/USER COLUMNS:');
    console.log('======================');
    const guestColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'pageviews_partitioned'
        AND TABLE_SCHEMA = 'preprocessed'
        AND (COLUMN_NAME LIKE '%guest%' 
             OR COLUMN_NAME LIKE '%user%'
             OR COLUMN_NAME LIKE '%reservation%')
      ORDER BY COLUMN_NAME
    `;
    
    guestColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'Nullable' : 'Not Null'}`);
    });

    // Check for path/URL columns for funnel analysis
    console.log('\n🌐 PATH/URL COLUMNS:');
    console.log('===================');
    const pathColumns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'pageviews_partitioned'
        AND TABLE_SCHEMA = 'preprocessed'
        AND (COLUMN_NAME LIKE '%path%' 
             OR COLUMN_NAME LIKE '%url%'
             OR COLUMN_NAME LIKE '%page%')
      ORDER BY COLUMN_NAME
    `;
    
    pathColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'Nullable' : 'Not Null'}`);
    });

    // Now test actual data availability with correct column names
    console.log('\n🔍 TESTING DATA AVAILABILITY (Last 90 days)');
    console.log('============================================');
    
    const last90Days = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const fromTimestamp = Math.floor(last90Days / 1000);
    const toTimestamp = Math.floor(Date.now() / 1000);
    
    // Test with the actual column names we found
    const bookingColumns = columns.map(col => col.COLUMN_NAME);
    
    if (bookingColumns.length > 0) {
      console.log(`\n📊 Testing with found booking columns: ${bookingColumns.join(', ')}`);
      
      // Build dynamic query to test each booking column
      let testQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT td_client_id) as unique_users`;
      
      bookingColumns.forEach(col => {
        testQuery += `,
          COUNT(CASE WHEN ${col} IS NOT NULL AND ${col} != '' THEN 1 END) as ${col}_count`;
      });
      
      testQuery += `
        FROM preprocessed.pageviews_partitioned TABLESAMPLE (5 PERCENT)
        WHERE time >= ${fromTimestamp}
          AND time <= ${toTimestamp}
      `;
      
      console.log('\n🚀 Executing test query...');
      const testResult = await prisma.$queryRaw(testQuery);
      const result = testResult[0];
      
      console.log(`\n✅ RESULTS:`);
      console.log(`   📊 Total records: ${Number(result.total_records).toLocaleString()}`);
      console.log(`   👥 Unique users: ${Number(result.unique_users).toLocaleString()}`);
      
      bookingColumns.forEach(col => {
        const count = Number(result[`${col}_count`] || 0);
        console.log(`   ${col}: ${count.toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBookingColumns().catch(console.error);
