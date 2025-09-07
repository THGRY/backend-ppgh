const Redis = require('ioredis');

async function clearCacheAndTest() {
  console.log('🔍 Investigating cache issue...\n');
  
  try {
    // Connect to Redis
    const redis = new Redis(process.env.REDIS_URL, {
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    await redis.connect();
    console.log('✅ Connected to Redis\n');

    // Check existing cache keys
    console.log('📋 Checking existing cache keys...');
    const keys = await redis.keys('l1:*unique_visitors*2025-01*');
    console.log(`Found ${keys.length} cache keys for unique_visitors in Jan 2025:`);
    keys.forEach((key, i) => {
      console.log(`  ${i+1}. ${key}`);
    });
    console.log('');

    // Check what's in one of these keys
    if (keys.length > 0) {
      console.log(`🔍 Examining cache content for: ${keys[0]}`);
      const cachedData = await redis.get(keys[0]);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        console.log(`   Cached unique_visitors: ${parsed.unique_visitors}`);
        console.log(`   Cached success: ${parsed.success}`);
        console.log(`   Cached time: ${parsed.query_time}`);
      }
      console.log('');
    }

    // Clear all L1 cache entries
    console.log('🧹 Clearing all L1 cache entries...');
    const allL1Keys = await redis.keys('l1:*');
    if (allL1Keys.length > 0) {
      await redis.del(...allL1Keys);
      console.log(`✅ Cleared ${allL1Keys.length} cache entries\n`);
    } else {
      console.log('ℹ️  No cache entries to clear\n');
    }

    // Also clear chunk-based cache
    console.log('🧹 Clearing chunk-based cache...');
    const chunkKeys = await redis.keys('l1_chunk:*');
    if (chunkKeys.length > 0) {
      await redis.del(...chunkKeys);
      console.log(`✅ Cleared ${chunkKeys.length} chunk cache entries\n`);
    } else {
      console.log('ℹ️  No chunk cache entries to clear\n');
    }

    await redis.disconnect();
    console.log('🎯 Cache cleared! Now test the API again...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

clearCacheAndTest();
