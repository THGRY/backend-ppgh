/**
 * Check what tables exist in the database
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    console.log('🔍 Checking what tables exist in the database...\n');
    
    // Get all tables in the database
    const tables = await prisma.$queryRaw`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    
    console.log('📋 Available tables:');
    console.log('═══════════════════════════════════════');
    
    let pageviewsTables = [];
    
    tables.forEach(table => {
      const fullName = `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`;
      console.log(`📄 ${fullName}`);
      
      if (table.TABLE_NAME.toLowerCase().includes('pageview')) {
        pageviewsTables.push(fullName);
      }
    });
    
    console.log('\n🎯 Pageviews-related tables found:');
    console.log('═══════════════════════════════════════');
    
    if (pageviewsTables.length > 0) {
      pageviewsTables.forEach(table => {
        console.log(`📊 ${table}`);
      });
      
      // Check the first pageviews table for data
      const mainTable = pageviewsTables[0];
      console.log(`\n🔍 Checking data in ${mainTable}...\n`);
      
      try {
        const count = await prisma.$queryRaw`
          SELECT COUNT(*) as record_count 
          FROM ${prisma.Prisma.raw(mainTable)}
        `;
        console.log(`📊 Records in ${mainTable}: ${count[0].record_count}`);
        
        if (Number(count[0].record_count) > 0) {
          // Check sample data structure
          const sample = await prisma.$queryRaw`
            SELECT TOP 5 
              time,
              td_client_id,
              booking_transaction_confirmationno,
              booking_transaction_confirmationno_1
            FROM ${prisma.Prisma.raw(mainTable)}
            WHERE td_client_id IS NOT NULL
          `;
          
          console.log('\n📋 Sample data:');
          sample.forEach((row, i) => {
            console.log(`${i+1}. time: ${row.time}, client_id: ${row.td_client_id}, booking1: ${row.booking_transaction_confirmationno}, booking2: ${row.booking_transaction_confirmationno_1}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Error checking ${mainTable}:`, error.message);
      }
      
    } else {
      console.log('❌ No pageviews tables found!');
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables().catch(console.error);
