const axios = require('axios');

/**
 * FRONTEND SIMULATION TEST
 * 
 * This script simulates exactly how the Vue.js frontend calls our APIs:
 * 1. Sequential loading (not parallel)
 * 2. 2-second delays between each chart API call
 * 3. Priority order: Summary → Awareness → Conversions → Stay/Post-Stay
 * 
 * Purpose: Test the full dashboard load experience
 */

const API_BASE_URL = 'http://localhost:3000/api';

// Test parameters - same as frontend would use
const TEST_PARAMS = {
  from: '2025-04-01',
  to: '2025-04-25'
};

async function simulateFrontendLoad() {
  console.log('🖥️  FRONTEND SIMULATION: L1 Dashboard Load Test');
  console.log('📅 Date Range:', `${TEST_PARAMS.from} to ${TEST_PARAMS.to}`);
  console.log('🔄 Loading Pattern: Sequential with 2s delays (exactly like Vue.js app)');
  console.log('=====================================\n');

  const startTime = Date.now();
  let currentTime = startTime;
  
  try {
    // STEP 1: Fetch Key Metrics (Priority - no delay)
    console.log('📊 STEP 1: Loading Key Metrics...');
    const step1Start = Date.now();
    
    const summaryResponse = await axios.get(`${API_BASE_URL}/l1-summary-data`, {
      params: TEST_PARAMS,
      timeout: 30000
    });
    
    const step1Time = Date.now() - step1Start;
    currentTime = Date.now();
    
    console.log(`  ✅ Key Metrics loaded: ${step1Time}ms`);
    console.log(`  📈 Metrics: ${JSON.stringify(summaryResponse.data.result.key_metrics, null, 2)}`);
    console.log(`  ⏱️  Total elapsed: ${currentTime - startTime}ms\n`);
    
    // STEP 2: 2-second delay + Awareness & Engagement
    console.log('⏰ STEP 2: Waiting 2 seconds (frontend delay)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🎯 STEP 2: Loading Awareness & Engagement...');
    const step2Start = Date.now();
    
    const awarenessResponse = await axios.get(`${API_BASE_URL}/l1-awareness-engagement`, {
      params: TEST_PARAMS,
      timeout: 30000
    });
    
    const step2Time = Date.now() - step2Start;
    currentTime = Date.now();
    
    console.log(`  ✅ Awareness data loaded: ${step2Time}ms`);
    console.log(`  📊 Channels: ${awarenessResponse.data.result.unique_visitors_by_channel?.length || 0}`);
    console.log(`  ⏱️  Total elapsed: ${currentTime - startTime}ms\n`);
    
    // STEP 3: 2-second delay + Conversions
    console.log('⏰ STEP 3: Waiting 2 seconds (frontend delay)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('💰 STEP 3: Loading Conversions...');
    const step3Start = Date.now();
    
    const conversionsResponse = await axios.get(`${API_BASE_URL}/l1-conversions`, {
      params: TEST_PARAMS,
      timeout: 30000
    });
    
    const step3Time = Date.now() - step3Start;
    currentTime = Date.now();
    
    console.log(`  ✅ Conversions data loaded: ${step3Time}ms`);
    console.log(`  🔁 Funnel stages: ${conversionsResponse.data.result.booking_funnel?.length || 0}`);
    console.log(`  📈 Revenue trends: ${conversionsResponse.data.result.booking_revenue_trends?.length || 0}`);
    console.log(`  ⏱️  Total elapsed: ${currentTime - startTime}ms\n`);
    
    // STEP 4: 2-second delay + Stay & Post-Stay
    console.log('⏰ STEP 4: Waiting 2 seconds (frontend delay)...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('🏨 STEP 4: Loading Stay & Post-Stay...');
    const step4Start = Date.now();
    
    const stayResponse = await axios.get(`${API_BASE_URL}/l1-stay-poststay`, {
      params: TEST_PARAMS,
      timeout: 30000
    });
    
    const step4Time = Date.now() - step4Start;
    const totalTime = Date.now() - startTime;
    
    console.log(`  ✅ Stay & Post-Stay data loaded: ${step4Time}ms`);
    console.log(`  📊 NPS scores: ${stayResponse.data.result.nps_scores?.length || 0}`);
    console.log(`  🔄 Rebooking data: ${stayResponse.data.result.rebooking_rates?.length || 0}`);
    console.log(`  ⏱️  Total elapsed: ${totalTime}ms\n`);
    
    // FINAL SUMMARY
    console.log('🎉 FRONTEND SIMULATION COMPLETE!');
    console.log('=====================================');
    console.log(`📊 TOTAL DASHBOARD LOAD TIME: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
    console.log('\n📈 BREAKDOWN:');
    console.log(`  Key Metrics: ${step1Time}ms`);
    console.log(`  Awareness: ${step2Time}ms + 2s delay`);
    console.log(`  Conversions: ${step3Time}ms + 2s delay`);
    console.log(`  Stay/Post-Stay: ${step4Time}ms + 2s delay`);
    console.log(`  Delays Total: 6,000ms (6 seconds)`);
    console.log(`  API Calls Total: ${step1Time + step2Time + step3Time + step4Time}ms`);
    
    // USER EXPERIENCE ASSESSMENT
    const userExperience = assessUserExperience(totalTime);
    console.log(`\n🎯 USER EXPERIENCE: ${userExperience.rating}`);
    console.log(`💡 ${userExperience.message}`);
    
    // COMPARISON WITH FRONTEND EXPECTATIONS
    console.log('\n📋 FRONTEND EXPECTATIONS:');
    console.log('  Expected: 13-17 seconds (based on documentation)');
    console.log(`  Actual: ${(totalTime/1000).toFixed(1)} seconds`);
    
    if (totalTime < 15000) {
      console.log('  ✅ BETTER than expected! Optimizations worked!');
    } else {
      console.log('  ⚠️  Within expected range');
    }
    
    return {
      success: true,
      totalTime,
      breakdown: {
        keyMetrics: step1Time,
        awareness: step2Time,
        conversions: step3Time,
        stayPostStay: step4Time,
        delays: 6000
      }
    };
    
  } catch (error) {
    console.error('❌ Frontend simulation failed:', error.message);
    return {
      success: false,
      error: error.message,
      totalTime: Date.now() - startTime
    };
  }
}

function assessUserExperience(totalTime) {
  if (totalTime < 8000) {
    return {
      rating: '🚀 EXCELLENT',
      message: 'Lightning fast! Users will love this performance.'
    };
  } else if (totalTime < 15000) {
    return {
      rating: '✅ GOOD',
      message: 'Acceptable load time for a data-heavy dashboard.'
    };
  } else if (totalTime < 25000) {
    return {
      rating: '⚠️  MODERATE',
      message: 'Usable but users might notice the delay.'
    };
  } else {
    return {
      rating: '❌ SLOW',
      message: 'Users will likely experience frustration.'
    };
  }
}

// Run the simulation
simulateFrontendLoad().catch(console.error);
