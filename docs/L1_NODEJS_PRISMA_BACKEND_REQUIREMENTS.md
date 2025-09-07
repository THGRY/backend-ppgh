# L1 Executive Dashboard - Node.js/Prisma Backend Requirements

**Date**: Created after comprehensive L1 end-to-end analysis  
**Purpose**: Complete backend requirements for migrating from Laravel/PHP to Node.js/Prisma  
**Target**: L1 Executive Dashboard real-time data requirements  

---

## 🎯 **EXECUTIVE SUMMARY**

Based on the comprehensive analysis of the L1 system, this document provides the complete requirements for implementing a Node.js/Prisma backend that can seamlessly replace the current Laravel backend while maintaining 100% API compatibility with the existing Vue.js frontend.

**Key Finding**: The L1 system requires **4 main API endpoints** with **14 distinct data functions** covering metrics, graphs, and analytics.

---

## 📊 **L1 SYSTEM ARCHITECTURE OVERVIEW**

### **Current Architecture (Laravel/PHP)**
```
Vue.js Frontend (L1)
├── l1MetricsStore.js (Axios HTTP calls)
├── ExecutiveDashboard.vue (Main dashboard)
├── KeyMetricsSection.vue (5 key metrics)
├── SummarySection.vue (3 summary cards)
├── AwarenessEngagementSection.vue (2 charts)
├── ConversionsSection.vue (2 charts)
└── StayPostStaySection.vue (2 charts)
    ↓
Laravel Backend (/api/l1-*)
├── UnifiedDataController.php (4 L1 methods)
├── MSSQLL1QueryFunctions.php (5 key metrics)
├── MSSQLL1GraphFunctions.php (6 chart functions)
└── Azure MSSQL Database (preprocessed.pageviews_partitioned)
```

### **Target Architecture (Node.js/Prisma)**
```
Vue.js Frontend (L1) [NO CHANGES REQUIRED]
├── l1MetricsStore.js (Same Axios calls)
├── Same Vue components
└── Same data contracts
    ↓
Node.js/Express Backend (/api/l1-*)
├── L1 Route Controllers (4 endpoints)
├── L1 Service Functions (14 data functions)
├── Prisma ORM (Database queries)
└── Azure MSSQL Database (Same tables & queries)
```

---

## 🔗 **API ENDPOINTS SPECIFICATION**

### **Required HTTP Endpoints (4 Total)**

The Node.js backend MUST implement these exact endpoints to maintain frontend compatibility:

#### **1. GET /api/l1-summary-data**
- **Purpose**: Key metrics + Summary cards data
- **Frontend Usage**: Called by `l1MetricsStore.fetchL1SummaryData()`
- **Parameters**: `from`, `to`, `filter_value` (query params)
- **Response Format**: See detailed schema below

#### **2. GET /api/l1-awareness-engagement**
- **Purpose**: Traffic analysis charts
- **Frontend Usage**: Called by `l1MetricsStore.fetchL1AwarenessEngagement()`
- **Parameters**: `from`, `to`, `filter_value` (query params)
- **Response Format**: Channel visitors + Login status data

#### **3. GET /api/l1-conversions**
- **Purpose**: Booking funnel + Revenue trends
- **Frontend Usage**: Called by `l1MetricsStore.fetchL1Conversions()`
- **Parameters**: `from`, `to`, `filter_value` (query params)
- **Response Format**: Funnel data + Revenue trends

#### **4. GET /api/l1-stay-poststay**
- **Purpose**: NPS scores + Re-booking rates
- **Frontend Usage**: Called by `l1MetricsStore.fetchL1StayPostStay()`
- **Parameters**: `from`, `to`, `filter_value` (query params)
- **Response Format**: NPS + Re-booking analytics

---

## 📋 **DETAILED DATA REQUIREMENTS**

### **DATABASE CONNECTION REQUIREMENTS**

```javascript
// Prisma Schema Configuration
// File: prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlserver"
  url      = env("MSSQL_L3_DATABASE_URL")
}

// Main table for L1 queries
model PageviewsPartitioned {
  // Core tracking fields
  id                                    String   @id
  time                                  String   // Unix timestamp
  td_client_id                          String?  // Visitor UUID
  td_url                                String?
  td_path                               String?
  td_referrer                           String?
  utm_source                            String?
  
  // User authentication fields
  user_userinfo_loginstatus            String?
  user_userinfo_loginstatus_1          String?
  user_userinfo_memberid               String?
  user_userinfo_memberid_1             String?
  
  // Booking transaction fields (primary)
  booking_transaction_confirmationno   String?
  booking_transaction_totalpayment     String?  // nvarchar - needs TRY_CAST
  booking_transaction_currencytype     String?
  
  // Booking transaction fields (secondary)
  booking_transaction_confirmationno_1 String?
  booking_transaction_totalpayment_1   String?  // nvarchar - needs TRY_CAST
  booking_transaction_currencytype_1   String?
  
  // Room nights fields
  booking_bookingwidget_totalnightstay String?  // nvarchar - needs TRY_CAST
  booking_bookingwidget_totalnightstay_1 String? // nvarchar - needs TRY_CAST
  
  @@map("preprocessed.pageviews_partitioned")
}

// Currency exchange rates table
model Currencies {
  id                    String  @id
  code                  String  // Currency code (USD, SGD, etc.)
  exchange_rate_to_usd  Float   // Exchange rate to USD
  
  @@map("pythia_db.currencies")
}
```

### **ENVIRONMENT VARIABLES**

```bash
# .env file
MSSQL_L3_DATABASE_URL="sqlserver://username:password@server:port;database=pppythia;encrypt=true;trustServerCertificate=true"
REDIS_URL="redis://localhost:6379"  # For caching
PORT=3000
NODE_ENV=production
```

---

## 🏗️ **BACKEND IMPLEMENTATION STRUCTURE**

### **Project Structure**
```
src/
├── controllers/
│   └── l1Controller.js           # 4 endpoint handlers
├── services/
│   ├── l1MetricsService.js       # 5 key metrics functions
│   ├── l1GraphService.js         # 6 chart functions
│   └── l1SummaryService.js       # 3 summary card functions
├── utils/
│   ├── dateUtils.js              # Date range validation
│   ├── cacheUtils.js             # Redis caching layer
│   └── sqlUtils.js               # SQL query helpers
├── middleware/
│   ├── errorHandler.js           # Error handling
│   └── validation.js             # Request validation
├── routes/
│   └── l1Routes.js               # Route definitions
├── prisma/
│   ├── schema.prisma             # Database schema
│   └── client.js                 # Prisma client instance
├── app.js                        # Express app setup
└── server.js                     # Server entry point
```

### **Package Dependencies**

```json
{
  "name": "pythia-l1-backend",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.2",
    "prisma": "^5.0.0",
    "@prisma/client": "^5.0.0",
    "redis": "^4.6.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0",
    "joi": "^17.9.0",
    "winston": "^3.8.0",
    "dotenv": "^16.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
  }
}
```

---

## 📊 **CRITICAL DATA FUNCTIONS (14 Total)**

### **L1 Key Metrics Service (5 Functions)**

#### **1. getL1UniqueVisitors()**
```javascript
// Purpose: Total distinct website visitors
// Database Logic: COUNT(DISTINCT td_client_id)
// SQL Pattern: SELECT COUNT(DISTINCT td_client_id) FROM pageviews_partitioned WHERE date_range
// Performance: TOP 500000 with date filtering
// Cache TTL: 30 minutes
// Response: { unique_visitors: 53532 }
```

#### **2. getL1TotalBookings()**
```javascript
// Purpose: Completed bookings with confirmation numbers
// Database Logic: COUNT(DISTINCT confirmation_no) from UNION of both confirmation columns
// SQL Pattern: UNION booking_transaction_confirmationno AND booking_transaction_confirmationno_1
// Performance: Date filtering + non-null confirmations
// Cache TTL: 15 minutes
// Response: { total_bookings: 1380 }
```

#### **3. getL1RoomNights()**
```javascript
// Purpose: Total hotel room nights booked
// Database Logic: SUM(TRY_CAST(nights AS FLOAT)) from both night columns
// SQL Pattern: SUM(TRY_CAST(booking_bookingwidget_totalnightstay AS FLOAT) + TRY_CAST(booking_bookingwidget_totalnightstay_1 AS FLOAT))
// Performance: Date filtering + null handling
// Cache TTL: 15 minutes
// Response: { room_nights: 4226 }
```

#### **4. getL1TotalRevenue()**
```javascript
// Purpose: Total booking revenue converted to USD
// Database Logic: SUM(payment * exchange_rate) with multi-currency conversion
// SQL Pattern: CTE with currency JOIN for exchange rates
// Complexity: HIGH - Multi-currency with exchange rate lookup
// Cache TTL: 15 minutes
// Response: { total_revenue: 1045500 }
```

#### **5. getL1ABV()**
```javascript
// Purpose: Average booking value (Revenue ÷ Bookings)
// Database Logic: total_revenue / total_bookings (calls functions 2 and 4)
// SQL Pattern: Simplified approach using cached results
// Performance: Uses cached values from other functions
// Cache TTL: 15 minutes
// Response: { abv: 517.25 }
```

### **L1 Graph Service (6 Functions)**

#### **6. getL1UniqueVisitorsByChannel()**
```javascript
// Purpose: Traffic source distribution analysis
// Database Logic: Channel classification using utm_source and td_referrer
// SQL Pattern: CASE statements for channel categorization + percentage calculation
// Chart Type: Horizontal bar chart
// Response: [{ channel: 'Organic Search', visitors: 45200, percentage: 35.9 }]
```

#### **7. getL1LoggedInVsOut()**
```javascript
// Purpose: User authentication status distribution
// Database Logic: Login status detection using user_userinfo_loginstatus fields
// SQL Pattern: CASE for login detection + percentage calculation
// Chart Type: Donut chart
// Response: { logged_in: { count: 75500, percentage: 60.0 }, logged_out: { count: 50340, percentage: 40.0 } }
```

#### **8. getL1BookingFunnel()**
```javascript
// Purpose: 5-stage booking conversion funnel
// Database Logic: Multi-stage funnel with URL pattern matching
// SQL Pattern: CTE with funnel stages + percentage calculations
// Chart Type: Funnel chart
// Response: [{ stage: 'Page Views', count: 125840, percentage: 100 }, { stage: 'Confirmation', count: 3956, percentage: 3.1 }]
```

#### **9. getL1BookingRevenueTrends()**
```javascript
// Purpose: Monthly revenue and booking trends
// Database Logic: Time series aggregation by month with currency conversion
// SQL Pattern: Monthly GROUP BY with revenue calculation
// Chart Type: Line chart
// Response: [{ month: 'Jan 2024', revenue: 1850000, bookings: 3200 }]
```

#### **10. getL1NPSScores()**
```javascript
// Purpose: Customer satisfaction proxy (booking completion rate)
// Database Logic: Quarterly satisfaction using booking completion as NPS proxy
// SQL Pattern: Quarterly aggregation with completion rate calculation
// Chart Type: Bar chart
// Note: PROXY METRIC - real NPS requires external survey data
// Response: [{ period: 'Q1 2024', nps_score: 68, response_count: 1240 }]
```

#### **11. getL1RebookingRates()**
```javascript
// Purpose: Customer retention and repeat booking analysis
// Database Logic: Complex customer history analysis for repeat bookings
// SQL Pattern: Self-join with historical booking detection
// Chart Type: Line chart
// Complexity: HIGH - requires historical data analysis
// Response: [{ period: 'Q1 2024', rebooking_rate: 28.5, total_guests: 12400 }]
```

### **L1 Summary Service (3 Functions)**

#### **12. getL1TrafficSummary()**
```javascript
// Purpose: Traffic overview with MoM/YoY trends
// Database Logic: Current vs previous month/year visitor comparison
// SQL Pattern: Multiple period CTEs with trend calculations
// Response: { value: 125840, change_mom: '+8.5%', change_yoy: '+22.1%', description: 'Organic search leading growth driver' }
```

#### **13. getL1ConversionSummary()**
```javascript
// Purpose: Booking performance with average stay analysis
// Database Logic: Bookings + average nights calculation with trends
// SQL Pattern: Combined booking and nights analysis
// Response: { value: 3956, change_mom: '+12.3%', avg_stay_nights: 2.1, description: 'Higher conversion from direct bookings' }
```

#### **14. getL1RevenueSummary()**
```javascript
// Purpose: Financial performance with revenue efficiency
// Database Logic: Revenue trends + ABV calculation
// SQL Pattern: Revenue analysis with MoM trends
// Response: { total_revenue: 2045500, change_mom: '+15.2%', abv: 517.25, description: 'Premium room categories driving growth' }
```

---

## 📝 **API RESPONSE SCHEMAS**

### **1. GET /api/l1-summary-data Response**

```json
{
  "success": true,
  "result": {
    "key_metrics": {
      "unique_visitors": 53532,
      "unique_visitors_trend": 8.5,
      "total_bookings": 1380,
      "total_bookings_trend": 12.3,
      "room_nights": 4226,
      "room_nights_trend": 5.7,
      "total_revenue": 1045500,
      "total_revenue_trend": 15.2,
      "abv": 517.25,
      "abv_trend": 3.8
    },
    "summary_cards": {
      "traffic": {
        "value": 53532,
        "change_mom": "+8.5%",
        "change_yoy": "+22.1%",
        "description": "Organic search leading growth driver"
      },
      "conversion": {
        "value": 1380,
        "change_mom": "+12.3%",
        "avg_stay_nights": 2.1,
        "description": "Higher conversion from direct bookings"
      },
      "revenue": {
        "total_revenue": 1045500,
        "change_mom": "+15.2%",
        "abv": 517.25,
        "description": "Premium room categories driving growth"
      }
    },
    "data_source": "REAL DATABASE DATA - Azure MSSQL pppythia",
    "date_range": "2025-07-01 to 2025-07-07",
    "property": "PPBTK"
  }
}
```

### **2. GET /api/l1-awareness-engagement Response**

```json
{
  "success": true,
  "result": {
    "unique_visitors_by_channel": [
      { "channel": "Organic Search", "visitors": 45200, "percentage": 35.9 },
      { "channel": "Direct", "visitors": 38100, "percentage": 30.3 },
      { "channel": "Social Media", "visitors": 21340, "percentage": 17.0 },
      { "channel": "Paid Search", "visitors": 13420, "percentage": 10.7 },
      { "channel": "Email", "visitors": 7780, "percentage": 6.1 }
    ],
    "logged_in_vs_out": {
      "logged_in": { "count": 75500, "percentage": 60.0 },
      "logged_out": { "count": 50340, "percentage": 40.0 }
    },
    "date_range": "2025-07-01 to 2025-07-07"
  }
}
```

### **3. GET /api/l1-conversions Response**

```json
{
  "success": true,
  "result": {
    "booking_funnel": [
      { "stage": "Page Views", "count": 125840, "percentage": 100 },
      { "stage": "Room Search", "count": 28420, "percentage": 22.6 },
      { "stage": "Room Selection", "count": 12680, "percentage": 10.1 },
      { "stage": "Booking Form", "count": 5840, "percentage": 4.6 },
      { "stage": "Confirmation", "count": 3956, "percentage": 3.1 }
    ],
    "booking_revenue": [
      { "month": "Jan 2024", "revenue": 1850000, "bookings": 3200 },
      { "month": "Feb 2024", "revenue": 1920000, "bookings": 3450 },
      { "month": "Mar 2024", "revenue": 2045500, "bookings": 3956 }
    ],
    "date_range": "2025-07-01 to 2025-07-07"
  }
}
```

### **4. GET /api/l1-stay-poststay Response**

```json
{
  "success": true,
  "result": {
    "nps_scores": [
      { "period": "Q1 2024", "nps_score": 68, "response_count": 1240 },
      { "period": "Q2 2024", "nps_score": 72, "response_count": 1450 },
      { "period": "Q3 2024", "nps_score": 75, "response_count": 1680 }
    ],
    "rebooking_rates": [
      { "period": "Q1 2024", "rebooking_rate": 28.5, "total_guests": 12400 },
      { "period": "Q2 2024", "rebooking_rate": 31.2, "total_guests": 14500 },
      { "period": "Q3 2024", "rebooking_rate": 33.8, "total_guests": 16800 }
    ],
    "date_range": "2025-07-01 to 2025-07-07"
  }
}
```

---

## ⚡ **PERFORMANCE & CACHING REQUIREMENTS**

### **Performance Optimization**

1. **Date Range Validation**
   - Maximum 1 year date range to prevent 60M+ record scans
   - Default to actual data range (2025-07-01 to 2025-07-07)
   - Mandatory date filtering on all queries

2. **Query Optimization**
   - Use `TOP 500000` with `ORDER BY [time] DESC` for large queries
   - Implement `TRY_CAST` for nvarchar to float conversions
   - Use CTEs for complex multi-stage calculations

3. **Caching Strategy**
   - Redis caching with 15-30 minute TTL
   - Cache keys: `l1_{function_name}_{from}_{to}_{property}`
   - Aggressive caching for performance-critical queries

### **Error Handling**

1. **Database Connection Failures**
   - Graceful fallback to zero values
   - Comprehensive error logging
   - Maintain API contract even on failures

2. **Data Quality Issues**
   - Handle null/empty values in calculations
   - Use `COALESCE` and `ISNULL` for robust queries
   - Validate numeric conversions with `TRY_CAST`

---

## 🚀 **IMPLEMENTATION PHASES**

### **Phase 1: Core Infrastructure (Week 1)**
- [ ] Set up Node.js/Express project structure
- [ ] Configure Prisma with Azure MSSQL connection
- [ ] Implement Redis caching layer
- [ ] Create basic error handling and logging
- [ ] Set up development environment

### **Phase 2: Key Metrics Implementation (Week 1-2)**
- [ ] Implement 5 key metrics functions
- [ ] Create `/api/l1-summary-data` endpoint
- [ ] Test against Laravel equivalent outputs
- [ ] Verify frontend compatibility
- [ ] Performance optimization and caching

### **Phase 3: Graph Functions Implementation (Week 2-3)**
- [ ] Implement 6 graph service functions
- [ ] Create remaining 3 API endpoints
- [ ] Complex SQL query implementation
- [ ] Chart data validation
- [ ] Frontend integration testing

### **Phase 4: Summary Functions & Polish (Week 3-4)**
- [ ] Implement 3 summary card functions
- [ ] Trend calculation implementation
- [ ] Final performance optimization
- [ ] Comprehensive testing
- [ ] Production deployment preparation

---

## 🔒 **SECURITY & DEPLOYMENT**

### **Security Requirements**
- CORS configuration for frontend domain
- Rate limiting (100 requests/minute per IP)
- SQL injection prevention (Prisma ORM)
- Input validation with Joi schemas
- Helmet.js security headers

### **Deployment Configuration**
- Docker containerization
- Environment-specific configurations
- Health check endpoints
- Monitoring and logging (Winston)
- Graceful shutdown handling

---

## ✅ **SUCCESS CRITERIA**

### **Functional Requirements**
1. **100% API Compatibility**: All 4 endpoints return identical data structures
2. **Performance Parity**: Response times ≤ Laravel equivalent (target: <2s)
3. **Data Accuracy**: All 14 data functions produce identical results
4. **Frontend Integration**: Zero frontend code changes required

### **Non-Functional Requirements**
1. **Reliability**: 99.9% uptime with proper error handling
2. **Scalability**: Handle concurrent requests efficiently
3. **Maintainability**: Clean code structure with proper documentation
4. **Monitoring**: Comprehensive logging and error tracking

---

## 📋 **MIGRATION CHECKLIST**

### **Pre-Migration**
- [ ] Complete Node.js backend development and testing
- [ ] Verify identical API responses with Laravel
- [ ] Set up production environment and database connections
- [ ] Configure monitoring and alerting
- [ ] Create rollback plan

### **Migration Day**
- [ ] Deploy Node.js backend to production
- [ ] Update frontend API base URL configuration
- [ ] Monitor dashboard functionality
- [ ] Verify all charts and metrics load correctly
- [ ] Performance monitoring

### **Post-Migration**
- [ ] 24-hour monitoring period
- [ ] Compare analytics data between old and new backend
- [ ] User acceptance testing
- [ ] Performance optimization if needed
- [ ] Documentation updates

---

## 🎯 **CONCLUSION**

This Node.js/Prisma backend will provide:

- **Seamless Migration**: Zero frontend changes required
- **Performance Optimization**: Efficient query patterns and caching
- **Real-time Data**: All 14 functions with live database connectivity
- **Scalability**: Modern Node.js architecture for future growth
- **Maintainability**: Clean separation of concerns and comprehensive documentation

**Estimated Development Time**: 3-4 weeks for complete implementation
**Team Requirements**: 1-2 Node.js developers familiar with Prisma and SQL Server
**Risk Level**: Low - well-defined requirements with proven SQL patterns

---

_This comprehensive documentation provides all necessary requirements for successfully implementing the Node.js/Prisma backend that will seamlessly replace the Laravel system while maintaining full L1 frontend compatibility._

**Document Status**: ✅ **COMPLETE AND IMPLEMENTATION-READY**  
**Next Step**: Begin Phase 1 development with project setup and infrastructure
