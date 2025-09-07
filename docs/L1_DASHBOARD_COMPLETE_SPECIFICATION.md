# L1 Executive Dashboard - Complete Specification & Date Range Integration

**Date**: December 2024  
**Purpose**: Complete specification of L1 Dashboard metrics, graphs, and date range functionality  
**Target**: Node.js backend integration with dynamic date range support  
**Status**: Ready for Node.js Implementation  

---

## 🎯 **EXECUTIVE SUMMARY**

The L1 Executive Dashboard is a **date-driven analytics system** that provides real-time business intelligence through **5 key metrics**, **9 interactive charts**, and **3 summary cards**. The entire dashboard dynamically updates based on user-selected date ranges, making the date range picker the central control mechanism for all data visualization.

**Total Dashboard Components**: **17 data-driven elements** that respond to date range changes  
**API Endpoints**: **4 endpoints** serving date-filtered data  
**Database Impact**: All queries include mandatory date filtering for performance  

---

## 📊 **L1 DASHBOARD COMPLETE STRUCTURE**

### **Dashboard Layout Overview**
```
L1 Executive Dashboard (/l1)
├── 🗓️ Date Range Picker (Global Control)
│   ├── Default Range: 2025-07-01 to 2025-07-07
│   ├── Max Range: 365 days (performance limit)
│   └── Updates ALL components on change
│
├── 📈 Key Metrics Section (5 Metrics)
│   ├── Unique Visitors + Trend
│   ├── Total Bookings + Trend  
│   ├── Room Nights + Trend
│   ├── Total Revenue (USD) + Trend
│   └── Average Booking Value + Trend
│
├── 📋 Summary Section (3 Cards)
│   ├── Traffic Summary Card
│   ├── Conversion Summary Card
│   └── Revenue Summary Card
│
├── 👀 Awareness & Engagement Section (2 Charts)
│   ├── Unique Visitors by Channel (Bar Chart)
│   └── Logged In vs Logged Out (Donut Chart)
│
├── 💰 Conversions Section (2 Charts)
│   ├── Booking Funnel (Funnel Chart)
│   └── Booking Revenue Trends (Line Chart)
│
└── 🏨 Stay & Post Stay Section (2 Charts)
    ├── NPS Scores (Bar Chart)
    └── Re-booking Rates (Line Chart)
```

---

## 📅 **DATE RANGE FUNCTIONALITY**

### **Date Range Picker Specification**

The date range picker is the **master control** for the entire dashboard:

```javascript
// Frontend: l1MetricsStore.js - Date Range Handler
function getDefaultDateRange() {
  const urlParams = new URLSearchParams(window.location.search);
  
  return {
    from: urlParams.get('from') || '2025-07-01',  // Default start date
    to: urlParams.get('to') || '2025-07-07',      // Default end date
    filter_value: urlParams.get('property') || 'PPBTK'  // Property filter
  };
}

// When date range changes, ALL data is refetched:
async function fetchAllL1Data(params = {}) {
  const [summaryData, awarenessData, conversionsData, stayPostStayData] = await Promise.allSettled([
    fetchL1SummaryData(params),      // 5 metrics + 3 summary cards
    fetchL1AwarenessEngagement(params),  // 2 charts
    fetchL1Conversions(params),          // 2 charts  
    fetchL1StayPostStay(params)          // 2 charts
  ]);
}
```

### **Date Range Validation & Performance**

```javascript
// Backend: Date Range Validation Logic
const validateDateRange = (fromDate, toDate) => {
  // 1. Maximum range limit (performance protection)
  const maxDays = 365;
  const actualDays = (new Date(toDate) - new Date(fromDate)) / (24 * 60 * 60 * 1000);
  
  if (actualDays > maxDays) {
    // Automatically limit to 365 days from toDate
    fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - maxDays);
    
    console.warn(`Date range limited to ${maxDays} days for performance`);
  }
  
  // 2. Default to data-rich range if not provided
  if (!fromDate || !toDate) {
    return {
      from: '2025-07-01',  // Range with actual data
      to: '2025-07-07'     // Latest date with data
    };
  }
  
  return { from: fromDate, to: toDate };
};
```

---

## 📈 **5 KEY METRICS (Date Range Dependent)**

All key metrics are **completely dependent on the selected date range** and include trend calculations:

### **1. Unique Visitors**
```json
{
  "metric": "unique_visitors",
  "purpose": "Total distinct website visitors in date range",
  "date_dependency": "CRITICAL - COUNT(DISTINCT td_client_id) WHERE date BETWEEN from AND to",
  "sql_pattern": "SELECT COUNT(DISTINCT td_client_id) FROM pageviews WHERE date_range",
  "performance_impact": "HIGH - 60M+ records, requires date filtering",
  "response_format": {
    "unique_visitors": 53532,
    "unique_visitors_trend": 8.5
  },
  "trend_calculation": "Compare current period vs previous period of same length"
}
```

### **2. Total Bookings**
```json
{
  "metric": "total_bookings", 
  "purpose": "Completed bookings with confirmation numbers in date range",
  "date_dependency": "CRITICAL - Filters booking_transaction_confirmationno WHERE date BETWEEN from AND to",
  "sql_pattern": "SELECT COUNT(DISTINCT confirmation_no) FROM pageviews WHERE date_range AND confirmation_no IS NOT NULL",
  "dual_columns": "booking_transaction_confirmationno + booking_transaction_confirmationno_1",
  "response_format": {
    "total_bookings": 1380,
    "total_bookings_trend": 12.3
  }
}
```

### **3. Room Nights**
```json
{
  "metric": "room_nights",
  "purpose": "Total hotel room nights booked in date range", 
  "date_dependency": "CRITICAL - Sums booking_bookingwidget_totalnightstay WHERE date BETWEEN from AND to",
  "sql_pattern": "SELECT SUM(TRY_CAST(nights AS FLOAT)) FROM pageviews WHERE date_range",
  "data_conversion": "nvarchar to float with TRY_CAST",
  "response_format": {
    "room_nights": 4226,
    "room_nights_trend": 5.7
  }
}
```

### **4. Total Revenue (USD)**
```json
{
  "metric": "total_revenue",
  "purpose": "Total booking revenue converted to USD for date range",
  "date_dependency": "CRITICAL - Sums booking_transaction_totalpayment WHERE date BETWEEN from AND to", 
  "complexity": "HIGH - Multi-currency conversion with exchange rates",
  "sql_pattern": "SELECT SUM(payment * exchange_rate) FROM pageviews JOIN currencies WHERE date_range",
  "response_format": {
    "total_revenue": 1045500,
    "total_revenue_trend": 15.2
  }
}
```

### **5. Average Booking Value (ABV)**
```json
{
  "metric": "abv",
  "purpose": "Revenue per booking (Total Revenue ÷ Total Bookings) for date range",
  "date_dependency": "DERIVED - Calculated from total_revenue and total_bookings for same date range",
  "calculation": "total_revenue / total_bookings",
  "response_format": {
    "abv": 517.25,
    "abv_trend": 3.8
  }
}
```

---

## 📋 **3 SUMMARY CARDS (Date Range Dependent)**

Summary cards provide **contextual analysis** with trend comparisons:

### **1. Traffic Summary Card**
```json
{
  "card": "traffic_summary",
  "purpose": "Traffic overview with growth trends and top channel insight",
  "date_dependency": "CRITICAL - Current period vs Month-over-Month vs Year-over-Year",
  "calculation_periods": {
    "current": "user_selected_date_range",
    "previous_month": "same_range_shifted_back_1_month", 
    "previous_year": "same_range_shifted_back_1_year"
  },
  "response_format": {
    "value": 53532,
    "change_mom": "+8.5%",
    "change_yoy": "+22.1%", 
    "description": "Organic search leading growth driver"
  }
}
```

### **2. Conversion Summary Card**
```json
{
  "card": "conversion_summary",
  "purpose": "Booking performance with average stay analysis",
  "date_dependency": "CRITICAL - Bookings and nights analysis for date range with MoM trends",
  "additional_metrics": "avg_stay_nights calculated from room_nights / total_bookings",
  "response_format": {
    "value": 1380,
    "change_mom": "+12.3%",
    "avg_stay_nights": 2.1,
    "description": "Higher conversion from direct bookings"
  }
}
```

### **3. Revenue Summary Card**
```json
{
  "card": "revenue_summary", 
  "purpose": "Financial performance with revenue efficiency",
  "date_dependency": "CRITICAL - Revenue analysis for date range with MoM trends",
  "includes_abv": "Combined revenue and ABV analysis",
  "response_format": {
    "total_revenue": 1045500,
    "change_mom": "+15.2%",
    "abv": 517.25,
    "description": "Premium room categories driving growth"
  }
}
```

---

## 📊 **9 INTERACTIVE CHARTS (Date Range Dependent)**

All charts are **dynamically filtered** by the selected date range:

### **Awareness & Engagement Section (2 Charts)**

#### **Chart 1: Unique Visitors by Channel (Bar Chart)**
```json
{
  "chart": "visitors_by_channel",
  "type": "horizontal_bar_chart", 
  "purpose": "Traffic source distribution analysis",
  "date_dependency": "CRITICAL - Channel classification WHERE date BETWEEN from AND to",
  "sql_logic": "CASE statements for channel categorization (utm_source, td_referrer)",
  "channels": ["Organic Search", "Direct", "Social Media", "Paid Search", "Email"],
  "response_format": [
    { "channel": "Organic Search", "visitors": 45200, "percentage": 35.9 },
    { "channel": "Direct", "visitors": 38100, "percentage": 30.3 },
    { "channel": "Social Media", "visitors": 21340, "percentage": 17.0 }
  ],
  "performance_note": "Uses proven L3 traffic classification logic"
}
```

#### **Chart 2: Logged In vs Logged Out Users (Donut Chart)**
```json
{
  "chart": "login_status_distribution",
  "type": "donut_chart",
  "purpose": "User authentication status distribution", 
  "date_dependency": "CRITICAL - Login status detection WHERE date BETWEEN from AND to",
  "sql_logic": "CASE statements for login detection (user_userinfo_loginstatus fields)",
  "response_format": {
    "logged_in": { "count": 75500, "percentage": 60.0 },
    "logged_out": { "count": 50340, "percentage": 40.0 }
  }
}
```

### **Conversions Section (2 Charts)**

#### **Chart 3: Booking Funnel (Funnel Chart)**
```json
{
  "chart": "booking_funnel",
  "type": "funnel_chart",
  "purpose": "5-stage booking conversion analysis",
  "date_dependency": "CRITICAL - All funnel stages filtered by date range",
  "stages": ["Page Views", "Room Search", "Room Selection", "Booking Form", "Confirmation"],
  "sql_logic": "Multi-stage CTE with URL pattern matching for each funnel stage",
  "response_format": [
    { "stage": "Page Views", "count": 125840, "percentage": 100 },
    { "stage": "Room Search", "count": 28420, "percentage": 22.6 },
    { "stage": "Room Selection", "count": 12680, "percentage": 10.1 },
    { "stage": "Booking Form", "count": 5840, "percentage": 4.6 },
    { "stage": "Confirmation", "count": 3956, "percentage": 3.1 }
  ]
}
```

#### **Chart 4: Booking Revenue Trends (Line Chart)**
```json
{
  "chart": "revenue_trends",
  "type": "line_chart",
  "purpose": "Monthly revenue and booking trends over time",
  "date_dependency": "EXTENDS date range back 5 months for trend analysis",
  "sql_logic": "Monthly GROUP BY with multi-currency revenue conversion",
  "response_format": [
    { "month": "Jan 2024", "revenue": 1850000, "bookings": 3200 },
    { "month": "Feb 2024", "revenue": 1920000, "bookings": 3450 },
    { "month": "Mar 2024", "revenue": 2045500, "bookings": 3956 }
  ],
  "special_note": "Extends user date range to show trends"
}
```

### **Stay & Post Stay Section (2 Charts)**

#### **Chart 5: NPS Scores (Bar Chart)**
```json
{
  "chart": "nps_scores",
  "type": "bar_chart", 
  "purpose": "Customer satisfaction tracking by quarters",
  "date_dependency": "EXTENDS date range back 12 months for quarterly analysis",
  "data_type": "PROXY METRIC - booking completion rate as NPS substitute",
  "sql_logic": "Quarterly aggregation with booking completion rate calculation",
  "response_format": [
    { "period": "Q1 2024", "nps_score": 68, "response_count": 1240 },
    { "period": "Q2 2024", "nps_score": 72, "response_count": 1450 },
    { "period": "Q3 2024", "nps_score": 75, "response_count": 1680 }
  ],
  "important_note": "Real NPS requires external survey data integration"
}
```

#### **Chart 6: Re-booking Rates (Line Chart)**
```json
{
  "chart": "rebooking_rates",
  "type": "line_chart",
  "purpose": "Customer retention and repeat booking analysis",
  "date_dependency": "EXTENDS date range back 12 months for historical analysis", 
  "complexity": "HIGH - requires customer history analysis",
  "sql_logic": "Complex self-join with historical booking detection",
  "response_format": [
    { "period": "Q1 2024", "rebooking_rate": 28.5, "total_guests": 12400 },
    { "period": "Q2 2024", "rebooking_rate": 31.2, "total_guests": 14500 },
    { "period": "Q3 2024", "rebooking_rate": 33.8, "total_guests": 16800 }
  ]
}
```

---

## 🔗 **NODE.JS BACKEND API SPECIFICATION**

### **Date Range Parameter Handling**

All 4 API endpoints must accept and process these parameters:

```javascript
// Request Parameters (Query String)
const requestParams = {
  from: '2025-07-01',        // Start date (YYYY-MM-DD)
  to: '2025-07-07',          // End date (YYYY-MM-DD) 
  filter_value: 'PPBTK'      // Property filter
};

// Backend Processing
app.get('/api/l1-*', (req, res) => {
  const { from, to, filter_value } = req.query;
  
  // 1. Validate and limit date range
  const validatedDates = validateDateRange(from, to);
  
  // 2. Apply to all database queries
  const sqlDateFilter = `
    CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE) 
    BETWEEN '${validatedDates.from}' AND '${validatedDates.to}'
  `;
  
  // 3. Include in all responses
  const response = {
    success: true,
    result: {
      // ... data ...
      date_range: `${validatedDates.from} to ${validatedDates.to}`,
      property: filter_value
    }
  };
});
```

### **API Endpoints with Date Range Integration**

#### **1. GET /api/l1-summary-data**
- **Components**: 5 Key Metrics + 3 Summary Cards
- **Date Filtering**: All metrics filtered by date range
- **Trend Calculations**: Compare current vs previous periods
- **Performance**: Aggressive caching (30 min TTL)

#### **2. GET /api/l1-awareness-engagement** 
- **Components**: 2 Charts (Visitors by Channel + Login Status)
- **Date Filtering**: All visitor analysis within date range
- **Performance**: Channel classification with date filtering

#### **3. GET /api/l1-conversions**
- **Components**: 2 Charts (Booking Funnel + Revenue Trends) 
- **Date Filtering**: Funnel analysis + Extended range for trends
- **Special Logic**: Revenue trends extend range for context

#### **4. GET /api/l1-stay-poststay**
- **Components**: 2 Charts (NPS Scores + Re-booking Rates)
- **Date Filtering**: Extended ranges for quarterly/historical analysis
- **Performance**: Complex queries with 12-month lookbacks

---

## ⚡ **PERFORMANCE OPTIMIZATION FOR DATE RANGES**

### **Database Query Optimization**

```sql
-- Standard Date Filter Pattern (used in ALL queries)
WHERE CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE) 
      BETWEEN @fromDate AND @toDate

-- Performance Optimizations:
-- 1. Mandatory date filtering (prevents 60M+ record scans)
-- 2. TOP limits for large result sets (TOP 500000)
-- 3. Indexed date calculations
-- 4. Proper parameter binding
```

### **Caching Strategy by Date Range**

```javascript
// Cache Key Pattern
const cacheKey = `l1_${functionName}_${fromDate}_${toDate}_${property}`;

// Cache TTL by Data Type
const cacheTTL = {
  key_metrics: 30 * 60,      // 30 minutes (frequently changing)
  summary_cards: 30 * 60,    // 30 minutes (trend calculations)
  charts: 30 * 60,           // 30 minutes (chart data)
  trends: 60 * 60            // 60 minutes (historical analysis)
};

// Cache Invalidation
// When date range changes, relevant caches are automatically invalid
// due to different cache keys
```

---

## 📊 **DASHBOARD DATA FLOW DIAGRAM**

```
📅 User Selects Date Range
         ↓
🔄 Frontend l1MetricsStore.getDefaultDateRange()
         ↓
📡 4 Parallel API Calls with Date Parameters
    ├── /api/l1-summary-data?from=X&to=Y
    ├── /api/l1-awareness-engagement?from=X&to=Y  
    ├── /api/l1-conversions?from=X&to=Y
    └── /api/l1-stay-poststay?from=X&to=Y
         ↓
🏗️ Node.js Backend Processing
    ├── Date Range Validation (max 365 days)
    ├── Cache Check (date-specific keys)
    ├── Database Queries (with date filtering)
    └── Response Formatting
         ↓
💾 Database Queries (Azure MSSQL)
    ├── preprocessed.pageviews_partitioned (date filtered)
    ├── pythia_db.currencies (for exchange rates)
    └── All queries include date range WHERE clause
         ↓
📈 Dashboard Updates
    ├── 5 Key Metrics (new values + trends)
    ├── 3 Summary Cards (new analysis)
    ├── 9 Charts (new visualizations)
    └── All components reflect selected date range
```

---

## 🎯 **IMPLEMENTATION CHECKLIST FOR NODE.JS**

### **Date Range Integration Requirements**

- [ ] **Parameter Validation**
  - [ ] Accept `from`, `to`, `filter_value` parameters
  - [ ] Validate date format (YYYY-MM-DD)
  - [ ] Limit maximum range to 365 days
  - [ ] Default to data-rich range (2025-07-01 to 2025-07-07)

- [ ] **Database Query Integration**
  - [ ] Include date filter in ALL 14 data functions
  - [ ] Implement proper SQL parameter binding
  - [ ] Handle extended date ranges for trend analysis
  - [ ] Optimize with date-based indexing

- [ ] **Caching Implementation**
  - [ ] Date-specific cache keys
  - [ ] Appropriate TTL for different data types
  - [ ] Cache invalidation strategy
  - [ ] Performance monitoring

- [ ] **Response Formatting**
  - [ ] Include `date_range` in all responses
  - [ ] Maintain exact schema compatibility
  - [ ] Error handling for invalid date ranges
  - [ ] Trend calculation consistency

### **Testing Requirements**

- [ ] **Date Range Testing**
  - [ ] Test various date ranges (1 day, 30 days, 365 days)
  - [ ] Test invalid date ranges (> 365 days)
  - [ ] Test edge cases (same start/end date)
  - [ ] Test date format validation

- [ ] **Performance Testing**
  - [ ] Query performance with different date ranges
  - [ ] Cache hit/miss ratios
  - [ ] Memory usage under load
  - [ ] Response time benchmarks

- [ ] **Data Accuracy Testing**
  - [ ] Compare results with Laravel backend
  - [ ] Verify trend calculations
  - [ ] Test multi-currency conversions
  - [ ] Validate chart data consistency

---

## 🚀 **CONCLUSION**

The L1 Executive Dashboard is a **date-centric analytics platform** where:

- **17 components** (5 metrics + 3 cards + 9 charts) are dynamically driven by date range selection
- **4 API endpoints** must implement robust date range handling
- **14 database functions** require date filtering for performance and accuracy
- **Node.js backend** must maintain 100% date range compatibility with current Laravel system

**Key Success Factor**: The date range picker must trigger **complete dashboard refresh** with all new data reflecting the selected time period.

**Performance Critical**: All database queries MUST include date filtering to prevent performance issues with 60M+ record tables.

**Frontend Compatibility**: Zero changes required - existing Vue.js components will automatically work with new Node.js backend.

---

_This specification provides complete guidance for implementing Node.js backend with full date range integration for the L1 Executive Dashboard._

**Document Status**: ✅ **COMPLETE - Ready for Node.js Implementation**  
**Total Components**: **17 date-driven elements**  
**API Endpoints**: **4 endpoints with date integration**  
**Database Functions**: **14 functions with date filtering**
