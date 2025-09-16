/**
 * COMPREHENSIVE API TESTING SUITE
 * 
 * This script performs exhaustive testing of all L1 Dashboard APIs to identify
 * performance issues that may have been caused by recent database updates.
 * 
 * Test Strategy:
 * 1. Test each API individually (5 key metrics + 3 chart endpoints = 8 APIs)
 * 2. Test with 20-day batches for each month (Jan-Jul 2025)
 * 3. Test with progressive larger date ranges (2-7 months)
 * 4. Simulate dashboard load (all APIs concurrently like frontend)
 * 5. Measure and compare response times
 * 6. Identify performance bottlenecks
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3000/api';

// Define test date ranges
const MONTHLY_20DAY_RANGES = [
  { name: 'Jan 2025', from: '2025-01-01', to: '2025-01-20' },
  { name: 'Feb 2025', from: '2025-02-01', to: '2025-02-20' },
  { name: 'Mar 2025', from: '2025-03-01', to: '2025-03-20' },
  { name: 'Apr 2025', from: '2025-04-01', to: '2025-04-20' },
  { name: 'May 2025', from: '2025-05-01', to: '2025-05-20' },
  { name: 'Jun 2025', from: '2025-06-01', to: '2025-06-20' },
  { name: 'Jul 2025', from: '2025-07-01', to: '2025-07-20' }
];

const PROGRESSIVE_RANGES = [
  { name: '2 Months', from: '2025-01-01', to: '2025-02-28' },
  { name: '3 Months', from: '2025-01-01', to: '2025-03-31' },
  { name: '4 Months', from: '2025-01-01', to: '2025-04-30' },
  { name: '5 Months', from: '2025-01-01', to: '2025-05-31' },
  { name: '6 Months', from: '2025-01-01', to: '2025-06-30' },
  { name: '7 Months', from: '2025-01-01', to: '2025-07-31' }
];

// Define all API endpoints to test
const API_ENDPOINTS = [
  { 
    name: 'Summary Data (5 Key Metrics)', 
    url: '/l1-summary-data',
    type: 'metrics',
    timeout: 30000 
  },
  { 
    name: 'Unique Visitors', 
    url: '/l1-unique-visitors',
    type: 'metric',
    timeout: 15000 
  },
  { 
    name: 'Total Bookings', 
    url: '/l1-total-bookings',
    type: 'metric',
    timeout: 15000 
  },
  { 
    name: 'Room Nights', 
    url: '/l1-room-nights',
    type: 'metric',
    timeout: 15000 
  },
  { 
    name: 'Total Revenue', 
    url: '/l1-total-revenue',
    type: 'metric',
    timeout: 20000 
  },
  { 
    name: 'Average Booking Value', 
    url: '/l1-abv',
    type: 'metric',
    timeout: 20000 
  },
  { 
    name: 'Awareness & Engagement', 
    url: '/l1-awareness-engagement',
    type: 'chart',
    timeout: 60000 
  },
  { 
    name: 'Conversions', 
    url: '/l1-conversions',
    type: 'chart',
    timeout: 60000 
  },
  { 
    name: 'Stay & Post-Stay', 
    url: '/l1-stay-poststay',
    type: 'chart',
    timeout: 120000 
  }
];

class APITester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testSummary: {
        totalTests: 0,
        successfulTests: 0,
        failedTests: 0,
        avgResponseTime: 0
      },
      individualApiTests: {},
      monthlyBatchTests: {},
      progressiveRangeTests: {},
      dashboardSimulation: {},
      performanceAnalysis: {},
      recommendations: []
    };
  }

  async runComprehensiveTests() {
    console.log('🚀 STARTING COMPREHENSIVE API TESTING SUITE');
    console.log('============================================\n');
    
    try {
      // Test 1: Individual API endpoints with single month
      await this.testIndividualAPIs();
      
      // Test 2: Monthly batch testing (20 days each month)
      await this.testMonthlyBatches();
      
      // Test 3: Progressive range testing (2-7 months)
      await this.testProgressiveRanges();
      
      // Test 4: Dashboard simulation (concurrent load)
      await this.testDashboardSimulation();
      
      // Test 5: Performance analysis and recommendations
      this.analyzePerformance();
      
      // Save results to file
      this.saveResults();
      
      console.log('\n🎉 COMPREHENSIVE TESTING COMPLETE!');
      console.log('Check comprehensive-test-results.json for detailed analysis');
      
    } catch (error) {
      console.error('❌ Testing suite failed:', error);
      this.saveResults(); // Save partial results
    }
  }

  async testIndividualAPIs() {
    console.log('📊 TEST 1: Individual API Performance (April 2025, 20 days)');
    console.log('=========================================================\n');
    
    const testRange = { from: '2025-04-01', to: '2025-04-20' };
    
    for (const endpoint of API_ENDPOINTS) {
      console.log(`🔍 Testing: ${endpoint.name}`);
      
      try {
        const startTime = Date.now();
        
        const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
          params: testRange,
          timeout: endpoint.timeout
        });
        
        const responseTime = Date.now() - startTime;
        
        const result = {
          success: response.data.success,
          responseTime: responseTime,
          endpoint: endpoint.url,
          type: endpoint.type,
          dataSize: JSON.stringify(response.data).length,
          error: response.data.success ? null : response.data.error
        };
        
        this.results.individualApiTests[endpoint.name] = result;
        this.results.testSummary.totalTests++;
        
        if (response.data.success) {
          this.results.testSummary.successfulTests++;
          console.log(`  ✅ Success: ${responseTime}ms (${this.getPerformanceRating(responseTime, endpoint.type)})`);
          
          // Log key data points for validation
          if (endpoint.type === 'metrics') {
            const metrics = response.data.result.key_metrics;
            console.log(`     📈 Visitors: ${metrics.unique_visitors}, Bookings: ${metrics.total_bookings}`);
          }
        } else {
          this.results.testSummary.failedTests++;
          console.log(`  ❌ Failed: ${response.data.error}`);
        }
        
      } catch (error) {
        const responseTime = Date.now() - Date.now(); // Will be 0 for errors
        
        this.results.individualApiTests[endpoint.name] = {
          success: false,
          responseTime: responseTime,
          endpoint: endpoint.url,
          type: endpoint.type,
          error: error.message
        };
        
        this.results.testSummary.totalTests++;
        this.results.testSummary.failedTests++;
        
        console.log(`  ❌ Error: ${error.message}`);
      }
      
      console.log(''); // Empty line
      await this.delay(500); // Small delay between tests
    }
  }

  async testMonthlyBatches() {
    console.log('📅 TEST 2: Monthly Batch Testing (20-day ranges)');
    console.log('================================================\n');
    
    // Test each endpoint with all monthly ranges
    for (const endpoint of API_ENDPOINTS.slice(0, 4)) { // Test key APIs only for speed
      console.log(`🔍 Testing ${endpoint.name} across all months:`);
      
      const monthlyResults = [];
      
      for (const range of MONTHLY_20DAY_RANGES) {
        try {
          const startTime = Date.now();
          
          const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
            params: { from: range.from, to: range.to },
            timeout: endpoint.timeout
          });
          
          const responseTime = Date.now() - startTime;
          
          const result = {
            month: range.name,
            dateRange: `${range.from} to ${range.to}`,
            success: response.data.success,
            responseTime: responseTime,
            error: response.data.success ? null : response.data.error
          };
          
          monthlyResults.push(result);
          
          if (response.data.success) {
            console.log(`  ${range.name}: ${responseTime}ms ✅`);
          } else {
            console.log(`  ${range.name}: FAILED ❌`);
          }
          
        } catch (error) {
          monthlyResults.push({
            month: range.name,
            dateRange: `${range.from} to ${range.to}`,
            success: false,
            responseTime: 0,
            error: error.message
          });
          
          console.log(`  ${range.name}: ERROR ❌`);
        }
        
        await this.delay(200);
      }
      
      this.results.monthlyBatchTests[endpoint.name] = monthlyResults;
      console.log(''); // Empty line
    }
  }

  async testProgressiveRanges() {
    console.log('📈 TEST 3: Progressive Range Testing (2-7 months)');
    console.log('=================================================\n');
    
    // Test summary API with progressively larger date ranges
    const summaryEndpoint = API_ENDPOINTS[0]; // Summary Data endpoint
    console.log(`🔍 Testing ${summaryEndpoint.name} with increasing date ranges:`);
    
    const progressiveResults = [];
    
    for (const range of PROGRESSIVE_RANGES) {
      try {
        console.log(`  Testing ${range.name}: ${range.from} to ${range.to}`);
        
        const startTime = Date.now();
        
        const response = await axios.get(`${API_BASE_URL}${summaryEndpoint.url}`, {
          params: { from: range.from, to: range.to },
          timeout: 90000 // Longer timeout for large ranges
        });
        
        const responseTime = Date.now() - startTime;
        
        const result = {
          range: range.name,
          dateRange: `${range.from} to ${range.to}`,
          success: response.data.success,
          responseTime: responseTime,
          dayCount: this.calculateDays(range.from, range.to),
          error: response.data.success ? null : response.data.error
        };
        
        progressiveResults.push(result);
        
        if (response.data.success) {
          const metrics = response.data.result.key_metrics;
          console.log(`    ✅ ${responseTime}ms - Visitors: ${metrics.unique_visitors.toLocaleString()}`);
        } else {
          console.log(`    ❌ FAILED: ${response.data.error}`);
        }
        
      } catch (error) {
        progressiveResults.push({
          range: range.name,
          dateRange: `${range.from} to ${range.to}`,
          success: false,
          responseTime: 0,
          dayCount: this.calculateDays(range.from, range.to),
          error: error.message
        });
        
        console.log(`    ❌ ERROR: ${error.message}`);
      }
      
      await this.delay(1000); // Longer delay for large queries
    }
    
    this.results.progressiveRangeTests = progressiveResults;
    console.log(''); // Empty line
  }

  async testDashboardSimulation() {
    console.log('🖥️  TEST 4: Dashboard Simulation (Concurrent Load)');
    console.log('==================================================\n');
    
    const testRange = { from: '2025-04-01', to: '2025-04-20' };
    
    console.log('🚀 Simulating frontend dashboard load (all APIs at once)...');
    console.log(`📅 Date Range: ${testRange.from} to ${testRange.to}`);
    
    const startTime = Date.now();
    
    try {
      // Run all APIs concurrently (like dashboard does)
      const promises = API_ENDPOINTS.map(async (endpoint) => {
        try {
          const apiStartTime = Date.now();
          
          const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
            params: testRange,
            timeout: endpoint.timeout
          });
          
          return {
            name: endpoint.name,
            success: response.data.success,
            responseTime: Date.now() - apiStartTime,
            error: response.data.success ? null : response.data.error
          };
          
        } catch (error) {
          return {
            name: endpoint.name,
            success: false,
            responseTime: 0,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      console.log('📊 Concurrent Load Results:');
      results.forEach(result => {
        if (result.success) {
          console.log(`  ${result.name}: ${result.responseTime}ms ✅`);
        } else {
          console.log(`  ${result.name}: FAILED ❌`);
        }
      });
      
      const successfulResults = results.filter(r => r.success);
      const slowestAPI = results.reduce((max, current) => 
        current.responseTime > max.responseTime ? current : max
      );
      
      console.log(`\n🎯 Dashboard Load Summary:`);
      console.log(`  Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      console.log(`  Successful APIs: ${successfulResults.length}/${results.length}`);
      console.log(`  Slowest API: ${slowestAPI.name} (${slowestAPI.responseTime}ms)`);
      
      this.results.dashboardSimulation = {
        totalTime,
        results,
        successfulCount: successfulResults.length,
        failedCount: results.length - successfulResults.length,
        slowestAPI: slowestAPI
      };
      
    } catch (error) {
      console.log(`❌ Dashboard simulation failed: ${error.message}`);
      this.results.dashboardSimulation = {
        success: false,
        error: error.message,
        totalTime: Date.now() - startTime
      };
    }
    
    console.log(''); // Empty line
  }

  analyzePerformance() {
    console.log('🔬 TEST 5: Performance Analysis & Recommendations');
    console.log('=================================================\n');
    
    const analysis = {
      overallHealthy: true,
      issues: [],
      recommendations: [],
      performanceStats: {}
    };
    
    // Analyze individual API performance
    const apiTimes = Object.values(this.results.individualApiTests)
      .filter(test => test.success)
      .map(test => test.responseTime);
    
    if (apiTimes.length > 0) {
      analysis.performanceStats = {
        avgResponseTime: Math.round(apiTimes.reduce((sum, time) => sum + time, 0) / apiTimes.length),
        minResponseTime: Math.min(...apiTimes),
        maxResponseTime: Math.max(...apiTimes),
        fastAPIs: apiTimes.filter(time => time < 1000).length,
        slowAPIs: apiTimes.filter(time => time > 5000).length
      };
      
      console.log('📊 Performance Statistics:');
      console.log(`  Average Response Time: ${analysis.performanceStats.avgResponseTime}ms`);
      console.log(`  Fastest API: ${analysis.performanceStats.minResponseTime}ms`);
      console.log(`  Slowest API: ${analysis.performanceStats.maxResponseTime}ms`);
      console.log(`  Fast APIs (< 1s): ${analysis.performanceStats.fastAPIs}`);
      console.log(`  Slow APIs (> 5s): ${analysis.performanceStats.slowAPIs}`);
    }
    
    // Check for performance issues
    if (analysis.performanceStats.avgResponseTime > 3000) {
      analysis.overallHealthy = false;
      analysis.issues.push('Average response time > 3 seconds');
      analysis.recommendations.push('Investigate database query optimization');
    }
    
    if (analysis.performanceStats.slowAPIs > 0) {
      analysis.overallHealthy = false;
      analysis.issues.push(`${analysis.performanceStats.slowAPIs} APIs taking > 5 seconds`);
      analysis.recommendations.push('Review slow API queries for optimization opportunities');
    }
    
    // Check progressive range performance
    if (this.results.progressiveRangeTests.length > 0) {
      const progressiveTimes = this.results.progressiveRangeTests
        .filter(test => test.success)
        .map(test => ({ range: test.range, time: test.responseTime, days: test.dayCount }));
      
      console.log(`\n📈 Progressive Range Analysis:`);
      progressiveTimes.forEach(test => {
        console.log(`  ${test.range}: ${test.time}ms (${test.days} days)`);
      });
      
      // Check if response time scales linearly with date range
      if (progressiveTimes.length >= 2) {
        const timeGrowth = progressiveTimes[progressiveTimes.length - 1].time / progressiveTimes[0].time;
        const dayGrowth = progressiveTimes[progressiveTimes.length - 1].days / progressiveTimes[0].days;
        
        if (timeGrowth > dayGrowth * 2) {
          analysis.overallHealthy = false;
          analysis.issues.push('Response time grows faster than date range size');
          analysis.recommendations.push('Database queries may not be properly optimized for large date ranges');
        }
      }
    }
    
    // Dashboard simulation analysis
    if (this.results.dashboardSimulation.totalTime > 15000) {
      analysis.issues.push('Dashboard load time > 15 seconds');
      analysis.recommendations.push('Consider implementing API response caching');
    }
    
    // Generate final recommendations
    if (analysis.overallHealthy) {
      analysis.recommendations.push('✅ APIs are performing well overall');
      console.log(`\n✅ Overall Status: HEALTHY`);
    } else {
      console.log(`\n⚠️  Overall Status: NEEDS ATTENTION`);
      console.log(`\n🚨 Issues Found:`);
      analysis.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log(`\n💡 Recommendations:`);
    analysis.recommendations.forEach(rec => console.log(`  - ${rec}`));
    
    this.results.performanceAnalysis = analysis;
    this.results.testSummary.avgResponseTime = analysis.performanceStats.avgResponseTime || 0;
  }

  getPerformanceRating(responseTime, type) {
    const thresholds = {
      metric: { fast: 500, slow: 2000 },
      metrics: { fast: 1000, slow: 3000 },
      chart: { fast: 2000, slow: 10000 }
    };
    
    const threshold = thresholds[type] || thresholds.metric;
    
    if (responseTime < threshold.fast) return 'FAST';
    if (responseTime < threshold.slow) return 'MODERATE';
    return 'SLOW';
  }

  calculateDays(fromDate, toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  saveResults() {
    const filename = `comprehensive-test-results-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Results saved to: ${filename}`);
  }
}

// Run the comprehensive test suite
async function runTests() {
  const tester = new APITester();
  await tester.runComprehensiveTests();
}

// Check if script is run directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { APITester, runTests };
