/**
 * MONTHLY BATCH TEST - 7 Months with 20-Day Ranges
 * 
 * Tests each month (Jan-Jul 2025) with 20-day batches to measure
 * performance degradation and identify which months are most affected
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3000/api';

// Exact 7 months mentioned: Jan-Jul 2025, each with 20-day range
const MONTHLY_TESTS = [
  { name: 'January 2025', from: '2025-01-01', to: '2025-01-20' },
  { name: 'February 2025', from: '2025-02-01', to: '2025-02-20' },
  { name: 'March 2025', from: '2025-03-01', to: '2025-03-20' },
  { name: 'April 2025', from: '2025-04-01', to: '2025-04-20' },
  { name: 'May 2025', from: '2025-05-01', to: '2025-05-20' },
  { name: 'June 2025', from: '2025-06-01', to: '2025-06-20' },
  { name: 'July 2025', from: '2025-07-01', to: '2025-07-20' }
];

// Focus on the key APIs mentioned: 5 metrics + 6 chart APIs (3 endpoints with 2 charts each)
const KEY_APIS = [
  { name: 'Summary (5 Key Metrics)', url: '/l1-summary-data', timeout: 60000, priority: 'HIGH' },
  { name: 'Unique Visitors', url: '/l1-unique-visitors', timeout: 30000, priority: 'HIGH' },
  { name: 'Total Bookings', url: '/l1-total-bookings', timeout: 30000, priority: 'HIGH' },
  { name: 'Awareness & Engagement', url: '/l1-awareness-engagement', timeout: 90000, priority: 'MEDIUM' },
  { name: 'Conversions', url: '/l1-conversions', timeout: 90000, priority: 'MEDIUM' },
  { name: 'Stay & Post-Stay', url: '/l1-stay-poststay', timeout: 120000, priority: 'LOW' }
];

class MonthlyBatchTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testType: 'Monthly 20-Day Batch Performance Test',
      testScope: '7 months (Jan-Jul 2025) with 20-day ranges each',
      monthlyResults: {},
      apiPerformance: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        avgResponseTimes: {},
        problemMonths: [],
        problemAPIs: []
      }
    };
  }

  async runMonthlyBatchTest() {
    console.log('📅 MONTHLY BATCH TEST: 7 Months × 20-Day Ranges');
    console.log('===============================================\n');
    
    console.log('📋 Test Configuration:');
    console.log(`  Months: ${MONTHLY_TESTS.length} (Jan-Jul 2025)`);
    console.log(`  APIs: ${KEY_APIS.length} key dashboard endpoints`);
    console.log(`  Date Range: 20 days per month`);
    console.log(`  Total Tests: ${MONTHLY_TESTS.length * KEY_APIS.length}\n`);

    try {
      // Test each month individually
      for (const month of MONTHLY_TESTS) {
        await this.testMonth(month);
        console.log(''); // Space between months
      }

      // Analyze results
      this.analyzeResults();

      // Save results
      this.saveResults();

      console.log('\n🎯 MONTHLY BATCH TEST COMPLETE!');
      console.log('Check monthly-batch-results.json for detailed analysis');

    } catch (error) {
      console.error('❌ Monthly batch test failed:', error);
      this.saveResults(); // Save partial results
    }
  }

  async testMonth(month) {
    console.log(`🗓️  Testing ${month.name}: ${month.from} to ${month.to}`);
    console.log('─'.repeat(50));

    const monthResults = {
      monthName: month.name,
      dateRange: `${month.from} to ${month.to}`,
      dayCount: this.calculateDays(month.from, month.to),
      apiResults: {},
      summary: {
        totalAPIs: KEY_APIS.length,
        successfulAPIs: 0,
        failedAPIs: 0,
        avgResponseTime: 0,
        fastestAPI: null,
        slowestAPI: null
      }
    };

    const responseTimes = [];
    let fastestTime = Infinity;
    let slowestTime = 0;
    let fastestAPI = '';
    let slowestAPI = '';

    // Test each API for this month
    for (const api of KEY_APIS) {
      console.log(`  🔍 ${api.name}...`);
      
      try {
        const startTime = Date.now();
        
        const response = await axios.get(`${API_BASE_URL}${api.url}`, {
          params: { from: month.from, to: month.to },
          timeout: api.timeout
        });
        
        const responseTime = Date.now() - startTime;
        const success = response.data.success;

        // Track performance
        if (success) {
          responseTimes.push(responseTime);
          monthResults.summary.successfulAPIs++;

          if (responseTime < fastestTime) {
            fastestTime = responseTime;
            fastestAPI = api.name;
          }
          if (responseTime > slowestTime) {
            slowestTime = responseTime;
            slowestAPI = api.name;
          }
        } else {
          monthResults.summary.failedAPIs++;
        }

        // Store detailed result
        monthResults.apiResults[api.name] = {
          success: success,
          responseTime: responseTime,
          priority: api.priority,
          status: this.getPerformanceStatus(responseTime, api.priority),
          error: success ? null : response.data.error,
          dataCheck: this.extractKeyData(response.data, api.name)
        };

        // Display result
        if (success) {
          const status = this.getPerformanceStatus(responseTime, api.priority);
          const statusEmoji = status === 'FAST' ? '🚀' : status === 'OK' ? '✅' : status === 'SLOW' ? '⚠️' : '🐌';
          console.log(`    ${statusEmoji} ${responseTime}ms (${status})`);
          
          // Show key data for validation
          if (api.name.includes('Summary')) {
            const metrics = response.data.result?.key_metrics;
            if (metrics) {
              console.log(`       📊 ${metrics.unique_visitors.toLocaleString()} visitors, ${metrics.total_bookings} bookings`);
            }
          }
        } else {
          console.log(`    ❌ FAILED: ${response.data.error}`);
        }

        this.results.summary.totalTests++;

      } catch (error) {
        console.log(`    💥 ERROR: ${error.message}`);
        
        monthResults.apiResults[api.name] = {
          success: false,
          responseTime: 0,
          priority: api.priority,
          status: 'ERROR',
          error: error.message
        };

        monthResults.summary.failedAPIs++;
        this.results.summary.totalTests++;
      }

      // Small delay to avoid overwhelming the database
      await this.delay(500);
    }

    // Calculate month summary
    if (responseTimes.length > 0) {
      monthResults.summary.avgResponseTime = Math.round(
        responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      );
      monthResults.summary.fastestAPI = { name: fastestAPI, time: fastestTime };
      monthResults.summary.slowestAPI = { name: slowestAPI, time: slowestTime };
    }

    // Store month results
    this.results.monthlyResults[month.name] = monthResults;
    
    // Update global summary
    this.results.summary.passedTests += monthResults.summary.successfulAPIs;
    this.results.summary.failedTests += monthResults.summary.failedAPIs;

    // Display month summary
    const healthStatus = this.assessMonthHealth(monthResults);
    console.log(`\n  📋 ${month.name} Summary: ${healthStatus.emoji} ${healthStatus.status}`);
    console.log(`     Success Rate: ${monthResults.summary.successfulAPIs}/${monthResults.summary.totalAPIs}`);
    console.log(`     Avg Response: ${monthResults.summary.avgResponseTime}ms`);
    
    if (monthResults.summary.successfulAPIs > 0) {
      console.log(`     Fastest: ${fastestAPI} (${fastestTime}ms)`);
      console.log(`     Slowest: ${slowestAPI} (${slowestTime}ms)`);
    }
  }

  analyzeResults() {
    console.log('\n🔬 ANALYSIS: Monthly Performance Patterns');
    console.log('=========================================\n');

    // Calculate average response times per API across all months
    for (const api of KEY_APIS) {
      const apiTimes = [];
      const apiSuccesses = [];
      
      for (const monthName of Object.keys(this.results.monthlyResults)) {
        const monthResult = this.results.monthlyResults[monthName];
        const apiResult = monthResult.apiResults[api.name];
        
        if (apiResult && apiResult.success) {
          apiTimes.push(apiResult.responseTime);
          apiSuccesses.push(monthName);
        }
      }

      if (apiTimes.length > 0) {
        this.results.apiPerformance[api.name] = {
          avgResponseTime: Math.round(apiTimes.reduce((sum, time) => sum + time, 0) / apiTimes.length),
          minResponseTime: Math.min(...apiTimes),
          maxResponseTime: Math.max(...apiTimes),
          successfulMonths: apiSuccesses,
          successRate: (apiSuccesses.length / MONTHLY_TESTS.length) * 100
        };
      }
    }

    // Identify problem APIs and months
    console.log('📊 API Performance Summary:');
    for (const [apiName, performance] of Object.entries(this.results.apiPerformance)) {
      const status = performance.avgResponseTime > 10000 ? '🚨 CRITICAL' : 
                    performance.avgResponseTime > 5000 ? '⚠️ SLOW' : '✅ GOOD';
      
      console.log(`  ${apiName}: ${performance.avgResponseTime}ms avg (${status})`);
      console.log(`    Range: ${performance.minResponseTime}ms - ${performance.maxResponseTime}ms`);
      console.log(`    Success: ${performance.successRate.toFixed(1)}%`);
      
      if (performance.avgResponseTime > 5000) {
        this.results.summary.problemAPIs.push(apiName);
      }
    }

    console.log('\n📅 Monthly Performance Summary:');
    for (const [monthName, monthResult] of Object.entries(this.results.monthlyResults)) {
      const health = this.assessMonthHealth(monthResult);
      console.log(`  ${monthName}: ${health.emoji} ${health.status} (${monthResult.summary.avgResponseTime}ms avg)`);
      
      if (health.status.includes('PROBLEM') || health.status.includes('CRITICAL')) {
        this.results.summary.problemMonths.push(monthName);
      }
    }

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const overallHealth = this.assessOverallHealth();
    console.log(`  System Health: ${overallHealth.emoji} ${overallHealth.status}`);
    console.log(`  Success Rate: ${this.results.summary.passedTests}/${this.results.summary.totalTests} (${((this.results.summary.passedTests/this.results.summary.totalTests)*100).toFixed(1)}%)`);
    
    if (this.results.summary.problemAPIs.length > 0) {
      console.log(`  Problem APIs: ${this.results.summary.problemAPIs.join(', ')}`);
    }
    
    if (this.results.summary.problemMonths.length > 0) {
      console.log(`  Problem Months: ${this.results.summary.problemMonths.join(', ')}`);
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (this.results.summary.problemAPIs.length === 0 && this.results.summary.problemMonths.length === 0) {
      console.log('  ✅ All APIs performing within acceptable ranges');
    } else {
      console.log('  🔍 Investigate database query optimization for slow APIs');
      console.log('  📊 Check database indexes and statistics');
      console.log('  🗄️ Consider query result caching for frequently accessed data');
      console.log('  🔧 Review recent database updates that may have affected performance');
    }
  }

  // Helper methods
  getPerformanceStatus(responseTime, priority) {
    const thresholds = {
      'HIGH': { fast: 2000, ok: 5000 },    // Key metrics should be very fast
      'MEDIUM': { fast: 5000, ok: 15000 }, // Chart APIs can be slower
      'LOW': { fast: 10000, ok: 30000 }    // Complex queries
    };

    const threshold = thresholds[priority] || thresholds['MEDIUM'];
    
    if (responseTime <= threshold.fast) return 'FAST';
    if (responseTime <= threshold.ok) return 'OK';
    if (responseTime <= threshold.ok * 2) return 'SLOW';
    return 'CRITICAL';
  }

  extractKeyData(responseData, apiName) {
    if (!responseData.success) return null;

    if (apiName.includes('Summary')) {
      const metrics = responseData.result?.key_metrics;
      return metrics ? {
        visitors: metrics.unique_visitors,
        bookings: metrics.total_bookings,
        revenue: Math.round(metrics.total_revenue)
      } : null;
    }

    if (apiName.includes('Visitors')) {
      return { visitors: responseData.result?.value };
    }

    return { success: true };
  }

  assessMonthHealth(monthResult) {
    const successRate = monthResult.summary.successfulAPIs / monthResult.summary.totalAPIs;
    const avgTime = monthResult.summary.avgResponseTime;

    if (successRate < 0.5) {
      return { emoji: '🚨', status: 'CRITICAL - Multiple failures' };
    } else if (avgTime > 20000) {
      return { emoji: '🐌', status: 'CRITICAL - Very slow' };
    } else if (avgTime > 10000) {
      return { emoji: '⚠️', status: 'PROBLEM - Slow responses' };
    } else if (avgTime > 5000) {
      return { emoji: '🔶', status: 'OK - Some delays' };
    } else {
      return { emoji: '✅', status: 'GOOD' };
    }
  }

  assessOverallHealth() {
    const successRate = this.results.summary.passedTests / this.results.summary.totalTests;
    const problemAPIs = this.results.summary.problemAPIs.length;
    const problemMonths = this.results.summary.problemMonths.length;

    if (successRate < 0.7 || problemAPIs >= 3) {
      return { emoji: '🚨', status: 'CRITICAL' };
    } else if (successRate < 0.9 || problemAPIs >= 2) {
      return { emoji: '⚠️', status: 'NEEDS ATTENTION' };
    } else if (problemMonths > 2) {
      return { emoji: '🔶', status: 'MODERATE ISSUES' };
    } else {
      return { emoji: '✅', status: 'GOOD' };
    }
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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `monthly-batch-results-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Detailed results saved to: ${filename}`);
  }
}

// Run the monthly batch test
async function runMonthlyBatchTest() {
  const tester = new MonthlyBatchTester();
  await tester.runMonthlyBatchTest();
}

// Check if script is run directly
if (require.main === module) {
  runMonthlyBatchTest().catch(console.error);
}

module.exports = { MonthlyBatchTester, runMonthlyBatchTest };
