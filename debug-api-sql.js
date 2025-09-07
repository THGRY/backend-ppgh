// Debug script to test the EXACT same SQL query as the API uses
const l1Service = require('./src/services/l1MetricsService');

async function testAPISQLDirectly() {
  console.log('🔍 Testing EXACT API SQL execution...\n');
  
  try {
    // Initialize the same Prisma instance as the API
    await l1Service.initializePrisma();
    const prisma = l1Service.prisma;
    
    // Use the EXACT same parameters and logic as the API
    const fromDate = '2025-01-01';
    const toDate = '2025-01-07';
    
    console.log(`📅 Testing date range: ${fromDate} to ${toDate}`);
    
    // Convert dates using the EXACT same logic as the API
    const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
    const toTimestamp = Math.floor(new Date(toDate).getTime() / 1000);
    
    console.log(`🕐 Timestamps: ${fromTimestamp} to ${toTimestamp}`);
    
    // Execute the EXACT same query as the API
    console.log('🔍 Executing API query...');
    const result = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    
    const uniqueVisitors = Number(result[0].unique_visitors);
    console.log(`✅ API Query Result: ${uniqueVisitors}`);
    
    // Now test with our direct SQL approach
    console.log('\n🔍 Testing direct SQL approach...');
    const directResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${fromTimestamp}
        AND time <= ${toTimestamp}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    
    const directVisitors = Number(directResult[0].unique_visitors);
    console.log(`✅ Direct Query Result: ${directVisitors}`);
    
    // Compare
    console.log('\n📊 COMPARISON:');
    console.log(`   API Method:    ${uniqueVisitors}`);
    console.log(`   Direct Method: ${directVisitors}`);
    console.log(`   Match: ${uniqueVisitors === directVisitors ? '✅ YES' : '❌ NO'}`);
    
    // Test with different date format
    console.log('\n🔍 Testing with different date conversion...');
    const altFromTimestamp = Math.floor(Date.parse(fromDate + 'T00:00:00Z') / 1000);
    const altToTimestamp = Math.floor(Date.parse(toDate + 'T23:59:59Z') / 1000);
    
    console.log(`🕐 Alternative timestamps: ${altFromTimestamp} to ${altToTimestamp}`);
    
    const altResult = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT td_client_id) as unique_visitors
      FROM preprocessed.pageviews_partitioned
      WHERE time >= ${altFromTimestamp}
        AND time <= ${altToTimestamp}
        AND td_client_id IS NOT NULL
        AND td_client_id != ''
    `;
    
    const altVisitors = Number(altResult[0].unique_visitors);
    console.log(`✅ Alternative Query Result: ${altVisitors}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testAPISQLDirectly();
