/**
 * PERFORMANCE DIAGNOSIS TEST
 * 
 * Focused testing to diagnose the specific performance issues mentioned:
 * - Dashboard APIs that were working but now failing
 * - 20-day batches across 7 months (Jan-Jul 2025)
 * - End-to-end performance measurement
 * - Database query timing analysis
 */

const axios = require('axios');
const fs = require('fs');

const API_BASE_URL = 'http://localhost:3000/api';

// Focus on the 7 months mentioned: Jan-Jul 2025
const FOCUS_MONTHS = [
  { name: 'January 2025', from: '2025-01-01', to: '2025-01-20', fullMonth: '2025-01-01', fullMonthTo: '2025-01-31' },
  { name: 'February 2025', from: '2025-02-01', to: '2025-02-20', fullMonth: '2025-02-01', fullMonthTo: '2025-02-28' },
  { name: 'March 2025', from: '2025-03-01', to: '2025-03-20', fullMonth: '2025-03-01', fullMonthTo: '2025-03-31' },
  { name: 'April 2025', from: '2025-04-01', to: '2025-04-20', fullMonth: '2025-04-01', fullMonthTo: '2025-04-30' },
  { name: 'May 2025', from: '2025-05-01', to: '2025-05-20', fullMonth: '2025-05-01', fullMonthTo: '2025-05-31' },
  { name: 'June 2025', from: '2025-06-01', to: '2025-06-20', fullMonth: '2025-06-01', fullMonthTo: '2025-06-30' },
  { name: 'July 2025', from: '2025-07-01', to: '2025-07-20', fullMonth: '2025-07-01', fullMonthTo: '2025-07-31' }
];

// Dashboard API endpoints (6 chart APIs + 5 key metrics as mentioned)
const DASHBOARD_APIS = [
  // 5 Key Metrics
  { name: 'Key Metrics Summary', url: '/l1-summary-data', priority: 1, expectedTime: 2000 },
  { name: 'Unique Visitors', url: '/l1-unique-visitors', priority: 2, expectedTime: 1000 },
  { name: 'Total Bookings', url: '/l1-total-bookings', priority: 2, expectedTime: 1500 },
  { name: 'Room Nights', url: '/l1-room-nights', priority: 2, expectedTime: 1500 },
  { name: 'Total Revenue', url: '/l1-total-revenue', priority: 2, expectedTime: 2000 },
  
  // 3 Chart APIs (6 charts total - 2 charts per endpoint)
  { name: 'Awareness & Engagement Charts', url: '/l1-awareness-engagement', priority: 3, expectedTime: 5000 },
  { name: 'Conversion Charts', url: '/l1-conversions', priority: 3, expectedTime: 8000 },
  { name: 'Stay & Post-Stay Charts', url: '/l1-stay-poststay', priority: 3, expectedTime: 12000 }
];

class PerformanceDiagnosis {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      testType: 'Performance Diagnosis - Database Update Impact',
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        performanceIssues: 0
      },
      monthlyPerformance: {},
      progressiveLoadTest: {},
      dashboardLoadTest: {},
      databaseAnalysis: {},
      diagnosis: {
        likelyIssues: [],
        recommendations: [],
        dataQualityCheck: {}
      }
    };
  }

  async runDiagnosis() {
    console.log('🔬 PERFORMANCE DIAGNOSIS: Database Update Impact Analysis');
    console.log('========================================================\n');
    
    console.log('📋 Test Scope:');
    console.log('  - 7 months: January 2025 to July 2025');
    console.log('  - 20-day batches per month');
    console.log('  - 8 dashboard APIs (5 metrics + 3 chart endpoints)');
    console.log('  - End-to-end performance measurement');
    console.log('  - Database query timing analysis\n');
    
    try {
      // Step 1: Test each month individually (20-day batches)
      await this.testMonthlyPerformance();
      
      // Step 2: Test progressive date ranges (1 month → 7 months)
      await this.testProgressiveLoad();
      
      // Step 3: Test dashboard concurrent load
      await this.testDashboardConcurrentLoad();
      
      // Step 4: Data quality verification
      await this.verifyDataQuality();
      
      // Step 5: Generate diagnosis and recommendations
      this.generateDiagnosis();
      
      // Save results
      this.saveResults();
      
      console.log('\n🎯 DIAGNOSIS COMPLETE - Check performance-diagnosis-results.json');
      
    } catch (error) {
      console.error('❌ Diagnosis failed:', error);
      this.saveResults();
    }
  }

  async testMonthlyPerformance() {
    console.log('📊 STEP 1: Monthly Performance Testing (20-day batches)');
    console.log('======================================================\n');
    
    for (const month of FOCUS_MONTHS) {
      console.log(`🗓️  Testing ${month.name}: ${month.from} to ${month.to}`);
      
      const monthResults = {
        monthName: month.name,
        dateRange: `${month.from} to ${month.to}`,
        apiResults: {},
        summary: {
          avgResponseTime: 0,
          fastAPIs: 0,
          slowAPIs: 0,
          failedAPIs: 0
        }
      };
      
      const responseTimes = [];
      
      // Test each API for this month
      for (const api of DASHBOARD_APIS) {
        try {
          console.log(`  🔍 ${api.name}...`);
          
          const startTime = Date.now();
          
          const response = await axios.get(`${API_BASE_URL}${api.url}`, {
            params: { from: month.from, to: month.to },
            timeout: 60000
          });
          
          const responseTime = Date.now() - startTime;
          responseTimes.push(responseTime);
          
          const isHealthy = responseTime < api.expectedTime;
          const status = this.getPerformanceStatus(responseTime, api.expectedTime);
          
          monthResults.apiResults[api.name] = {
            success: response.data.success,
            responseTime: responseTime,
            expectedTime: api.expectedTime,
            isHealthy: isHealthy,
            status: status,
            dataCheck: this.extractDataSummary(response.data, api.name)
          };
          
          if (response.data.success) {
            console.log(`    ✅ ${responseTime}ms (${status})`);
            if (isHealthy) monthResults.summary.fastAPIs++;
            else monthResults.summary.slowAPIs++;
          } else {
            console.log(`    ❌ FAILED: ${response.data.error}`);
            monthResults.summary.failedAPIs++;
          }
          
        } catch (error) {
          console.log(`    ❌ ERROR: ${error.message}`);
          
          monthResults.apiResults[api.name] = {
            success: false,
            responseTime: 0,
            expectedTime: api.expectedTime,
            isHealthy: false,
            status: 'ERROR',
            error: error.message
          };
          
          monthResults.summary.failedAPIs++;
        }
        
        await this.delay(300); // Small delay between API calls
      }
      
      // Calculate month summary
      if (responseTimes.length > 0) {
        monthResults.summary.avgResponseTime = Math.round(
          responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
        );
      }
      
      this.results.monthlyPerformance[month.name] = monthResults;
      
      // Month summary
      const healthStatus = monthResults.summary.failedAPIs === 0 && 
                          monthResults.summary.slowAPIs <= 1 ? '✅ HEALTHY' : '⚠️ ISSUES';
      
      console.log(`  📋 Month Summary: ${healthStatus}`);
      console.log(`     Avg Response: ${monthResults.summary.avgResponseTime}ms`);
      console.log(`     Fast/Slow/Failed: ${monthResults.summary.fastAPIs}/${monthResults.summary.slowAPIs}/${monthResults.summary.failedAPIs}\n`);
      
      this.results.summary.totalTests += DASHBOARD_APIS.length;
      this.results.summary.passedTests += monthResults.summary.fastAPIs + monthResults.summary.slowAPIs;
      this.results.summary.failedTests += monthResults.summary.failedAPIs;
      this.results.summary.performanceIssues += monthResults.summary.slowAPIs;
    }
  }

  async testProgressiveLoad() {
    console.log('📈 STEP 2: Progressive Date Range Testing');
    console.log('=========================================\n');
    
    console.log('Testing Summary API with increasing date ranges:');
    
    const progressiveRanges = [
      { name: '1 Month', from: '2025-01-01', to: '2025-01-31' },
      { name: '2 Months', from: '2025-01-01', to: '2025-02-28' },
      { name: '3 Months', from: '2025-01-01', to: '2025-03-31' },
      { name: '4 Months', from: '2025-01-01', to: '2025-04-30' },
      { name: '5 Months', from: '2025-01-01', to: '2025-05-31' },
      { name: '6 Months', from: '2025-01-01', to: '2025-06-30' },
      { name: '7 Months (Full Range)', from: '2025-01-01', to: '2025-07-31' }
    ];
    
    const progressiveResults = [];
    
    for (const range of progressiveRanges) {
      try {
        console.log(`🔍 Testing ${range.name}: ${range.from} to ${range.to}`);
        
        const startTime = Date.now();
        
        const response = await axios.get(`${API_BASE_URL}/l1-summary-data`, {
          params: { from: range.from, to: range.to },
          timeout: 120000 // 2 minutes for large ranges
        });
        
        const responseTime = Date.now() - startTime;
        const dayCount = this.calculateDays(range.from, range.to);
        
        const result = {
          rangeName: range.name,
          dateRange: `${range.from} to ${range.to}`,
          dayCount: dayCount,
          responseTime: responseTime,
          success: response.data.success,
          timePerDay: Math.round(responseTime / dayCount),
          metrics: response.data.success ? response.data.result.key_metrics : null
        };
        
        progressiveResults.push(result);
        
        if (response.data.success) {
          const metrics = response.data.result.key_metrics;
          console.log(`  ✅ ${responseTime}ms (${result.timePerDay}ms/day)`);
          console.log(`     Visitors: ${metrics.unique_visitors.toLocaleString()}, Bookings: ${metrics.total_bookings}`);
        } else {
          console.log(`  ❌ FAILED: ${response.data.error}`);
        }
        
      } catch (error) {
        console.log(`  ❌ ERROR: ${error.message}`);
        
        progressiveResults.push({
          rangeName: range.name,
          dateRange: `${range.from} to ${range.to}`,
          dayCount: this.calculateDays(range.from, range.to),
          responseTime: 0,
          success: false,
          error: error.message
        });
      }
      
      await this.delay(2000); // Longer delay for large queries
    }
    
    this.results.progressiveLoadTest = {
      ranges: progressiveResults,
      analysis: this.analyzeProgressivePerformance(progressiveResults)
    };
    
    console.log('\n📊 Progressive Load Analysis:');
    console.log(`  Performance scaling: ${this.results.progressiveLoadTest.analysis.scalingQuality}`);
    console.log(`  7-month performance: ${this.results.progressiveLoadTest.analysis.fullRangeStatus}\n`);
  }

  async testDashboardConcurrentLoad() {
    console.log('🖥️ STEP 3: Dashboard Concurrent Load Test');
    console.log('==========================================\n');
    
    const testRange = { from: '2025-04-01', to: '2025-04-20' };
    
    console.log(`🚀 Simulating frontend dashboard load...`);
    console.log(`📅 Date Range: ${testRange.from} to ${testRange.to}`);
    console.log('🔄 Running all APIs concurrently (like dashboard frontend)\n');
    
    try {
      const startTime = Date.now();
      
      // Run all dashboard APIs concurrently
      const promises = DASHBOARD_APIS.map(async (api) => {
        const apiStartTime = Date.now();
        
        try {
          const response = await axios.get(`${API_BASE_URL}${api.url}`, {
            params: testRange,
            timeout: 90000
          });
          
          return {
            name: api.name,
            url: api.url,
            priority: api.priority,
            expectedTime: api.expectedTime,
            responseTime: Date.now() - apiStartTime,
            success: response.data.success,
            error: response.data.success ? null : response.data.error
          };
          
        } catch (error) {
          return {
            name: api.name,
            url: api.url,
            priority: api.priority,
            expectedTime: api.expectedTime,
            responseTime: Date.now() - apiStartTime,
            success: false,
            error: error.message
          };
        }
      });
      
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // Analyze results
      const successfulAPIs = results.filter(r => r.success);
      const failedAPIs = results.filter(r => !r.success);
      const slowAPIs = results.filter(r => r.success && r.responseTime > r.expectedTime);
      
      console.log('📊 Concurrent Load Results:');
      results.forEach(result => {
        const status = result.success ? 
          (result.responseTime <= result.expectedTime ? '✅ FAST' : '⚠️ SLOW') : 
          '❌ FAILED';
        console.log(`  ${result.name}: ${result.responseTime}ms ${status}`);
      });
      
      console.log(`\n🎯 Dashboard Performance Summary:`);
      console.log(`  Total Load Time: ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`);
      console.log(`  Successful APIs: ${successfulAPIs.length}/${results.length}`);
      console.log(`  Performance Issues: ${slowAPIs.length}`);
      console.log(`  Failed APIs: ${failedAPIs.length}`);
      
      // Dashboard experience assessment
      const userExperience = this.assessDashboardExperience(totalTime, successfulAPIs.length, results.length);
      console.log(`  User Experience: ${userExperience}\n`);
      
      this.results.dashboardLoadTest = {
        totalTime: totalTime,
        results: results,
        summary: {
          successfulAPIs: successfulAPIs.length,
          failedAPIs: failedAPIs.length,
          slowAPIs: slowAPIs.length,
          userExperience: userExperience
        }
      };
      
    } catch (error) {
      console.log(`❌ Dashboard concurrent load test failed: ${error.message}\n`);
      
      this.results.dashboardLoadTest = {
        success: false,
        error: error.message
      };
    }
  }

  async verifyDataQuality() {
    console.log('🔍 STEP 4: Data Quality Verification');
    console.log('====================================\n');
    
    console.log('Checking data consistency across months...');
    
    const dataCheck = {
      monthlyVariation: {},
      suspiciousPatterns: [],
      dataIntegrity: 'CHECKING'
    };
    
    // Get metrics for each month and check for patterns
    const months = FOCUS_MONTHS.slice(0, 3); // Test first 3 months for speed
    
    for (const month of months) {
      try {
        const response = await axios.get(`${API_BASE_URL}/l1-summary-data`, {
          params: { from: month.from, to: month.to },
          timeout: 30000
        });
        
        if (response.data.success) {
          const metrics = response.data.result.key_metrics;
          dataCheck.monthlyVariation[month.name] = {
            unique_visitors: metrics.unique_visitors,
            total_bookings: metrics.total_bookings,
            total_revenue: metrics.total_revenue
          };
          
          console.log(`  ${month.name}: ${metrics.unique_visitors.toLocaleString()} visitors, ${metrics.total_bookings} bookings`);
        }
        
      } catch (error) {
        console.log(`  ${month.name}: ERROR - ${error.message}`);
      }
    }
    
    // Analyze data patterns
    const monthlyData = Object.values(dataCheck.monthlyVariation);
    if (monthlyData.length >= 2) {
      // Check for identical values (possible caching issue)
      const uniqueVisitorCounts = [...new Set(monthlyData.map(d => d.unique_visitors))];
      const uniqueBookingCounts = [...new Set(monthlyData.map(d => d.total_bookings))];
      
      if (uniqueVisitorCounts.length === 1) {
        dataCheck.suspiciousPatterns.push('All months show identical visitor counts');
      }
      
      if (uniqueBookingCounts.length === 1) {
        dataCheck.suspiciousPatterns.push('All months show identical booking counts');
      }
      
      dataCheck.dataIntegrity = dataCheck.suspiciousPatterns.length === 0 ? 'GOOD' : 'SUSPICIOUS';
    }
    
    console.log(`\n📋 Data Quality: ${dataCheck.dataIntegrity}`);
    if (dataCheck.suspiciousPatterns.length > 0) {
      console.log('⚠️ Suspicious Patterns:');
      dataCheck.suspiciousPatterns.forEach(pattern => console.log(`  - ${pattern}`));
    }
    
    this.results.diagnosis.dataQualityCheck = dataCheck;
    console.log('');
  }

  generateDiagnosis() {
    console.log('🎯 STEP 5: Generating Diagnosis & Recommendations');
    console.log('=================================================\n');
    
    const diagnosis = this.results.diagnosis;
    
    // Analyze performance trends
    const monthlyResults = Object.values(this.results.monthlyPerformance);
    const avgResponseTimes = monthlyResults.map(month => month.summary.avgResponseTime);
    const failedTests = monthlyResults.reduce((sum, month) => sum + month.summary.failedAPIs, 0);
    const slowTests = monthlyResults.reduce((sum, month) => sum + month.summary.slowAPIs, 0);
    
    // Generate likely issues
    if (failedTests > 0) {
      diagnosis.likelyIssues.push(`${failedTests} API endpoints are failing completely`);
    }
    
    if (slowTests > 0) {
      diagnosis.likelyIssues.push(`${slowTests} API endpoints have performance degradation`);
    }
    
    if (avgResponseTimes.length > 0) {
      const maxResponseTime = Math.max(...avgResponseTimes);
      if (maxResponseTime > 10000) {
        diagnosis.likelyIssues.push('Severe performance degradation detected (>10s response times)');
      }
    }
    
    // Check progressive load issues
    if (this.results.progressiveLoadTest.analysis?.scalingQuality === 'POOR') {
      diagnosis.likelyIssues.push('Database queries do not scale well with date range size');
    }
    
    // Data quality issues
    if (this.results.diagnosis.dataQualityCheck.dataIntegrity === 'SUSPICIOUS') {
      diagnosis.likelyIssues.push('Data consistency issues detected - possible database update impact');
    }
    
    // Generate recommendations
    if (diagnosis.likelyIssues.length === 0) {
      diagnosis.recommendations.push('✅ APIs are performing within expected parameters');
    } else {
      diagnosis.recommendations.push('🔍 Investigate recent database updates and their impact on query performance');
      
      if (failedTests > 0) {
        diagnosis.recommendations.push('🚨 Priority: Fix failing API endpoints immediately');
      }
      
      if (slowTests > 0) {
        diagnosis.recommendations.push('⚡ Optimize slow database queries (check indexes, query plans)');
      }
      
      diagnosis.recommendations.push('🔬 Run EXPLAIN PLAN on slow queries to identify bottlenecks');
      diagnosis.recommendations.push('📊 Check database statistics and index fragmentation');
      diagnosis.recommendations.push('🛠️ Consider implementing query result caching for frequently accessed data');
    }
    
    // Final diagnosis
    const overallStatus = diagnosis.likelyIssues.length === 0 ? 'HEALTHY' : 
                         diagnosis.likelyIssues.length <= 2 ? 'NEEDS ATTENTION' : 'CRITICAL';
    
    console.log(`🎯 OVERALL DIAGNOSIS: ${overallStatus}\n`);
    
    if (diagnosis.likelyIssues.length > 0) {
      console.log('🚨 Issues Identified:');
      diagnosis.likelyIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
      console.log('');
    }
    
    console.log('💡 Recommendations:');
    diagnosis.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
    
    diagnosis.overallStatus = overallStatus;
  }

  // Helper methods
  getPerformanceStatus(actualTime, expectedTime) {
    if (actualTime <= expectedTime) return 'HEALTHY';
    if (actualTime <= expectedTime * 1.5) return 'SLOW';
    return 'CRITICAL';
  }

  extractDataSummary(responseData, apiName) {
    if (!responseData.success) return null;
    
    if (apiName.includes('Summary')) {
      const metrics = responseData.result.key_metrics;
      return {
        visitors: metrics.unique_visitors,
        bookings: metrics.total_bookings,
        revenue: Math.round(metrics.total_revenue)
      };
    }
    
    return { success: true };
  }

  analyzeProgressivePerformance(results) {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length < 2) {
      return { scalingQuality: 'UNKNOWN', fullRangeStatus: 'FAILED' };
    }
    
    // Check if response time scales reasonably with data size
    const first = successfulResults[0];
    const last = successfulResults[successfulResults.length - 1];
    
    const timeIncrease = last.responseTime / first.responseTime;
    const dayIncrease = last.dayCount / first.dayCount;
    
    let scalingQuality;
    if (timeIncrease <= dayIncrease * 1.2) {
      scalingQuality = 'GOOD';
    } else if (timeIncrease <= dayIncrease * 2) {
      scalingQuality = 'MODERATE';
    } else {
      scalingQuality = 'POOR';
    }
    
    const fullRangeResult = results.find(r => r.rangeName.includes('7 Months'));
    const fullRangeStatus = fullRangeResult?.success ? 
      (fullRangeResult.responseTime < 30000 ? 'GOOD' : 'SLOW') : 'FAILED';
    
    return { scalingQuality, fullRangeStatus };
  }

  assessDashboardExperience(totalTime, successfulAPIs, totalAPIs) {
    if (successfulAPIs < totalAPIs) {
      return '❌ BROKEN - Some APIs failing';
    }
    
    if (totalTime < 10000) {
      return '🚀 EXCELLENT';
    } else if (totalTime < 20000) {
      return '✅ GOOD';
    } else if (totalTime < 40000) {
      return '⚠️ SLOW';
    } else {
      return '❌ UNACCEPTABLE';
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
    const filename = `performance-diagnosis-results-${timestamp}.json`;
    fs.writeFileSync(filename, JSON.stringify(this.results, null, 2));
    console.log(`\n📁 Detailed results saved to: ${filename}`);
  }
}

// Run the diagnosis
async function runDiagnosis() {
  const diagnosis = new PerformanceDiagnosis();
  await diagnosis.runDiagnosis();
}

// Check if script is run directly
if (require.main === module) {
  runDiagnosis().catch(console.error);
}

module.exports = { PerformanceDiagnosis, runDiagnosis };
