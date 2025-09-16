# Complete API SQL Queries Documentation

This document contains all SQL queries used across the APIs with their purposes, metrics, and business logic.

## Overview
- **Total APIs**: 11 endpoints
- **Total SQL Queries**: 11 main queries (OPTIMIZED versions)
- **Database**: Azure MSSQL Server (pythia)
- **Main Table**: `preprocessed.pageviews_partitioned`
- **Secondary Table**: `pythia_db.currencies` (for exchange rates)

## 🚀 LATEST OPTIMIZATIONS (2025-09-12)
- **Unique Visitors**: Replaced with CTE and BETWEEN clause
- **Total Bookings**: Optimized with CROSS APPLY instead of UNION
- **Room Nights**: Updated to use BETWEEN instead of >= AND <=
- **Revenue**: Optimized with CROSS APPLY for better performance
- **Performance Impact**: Significant speed improvements on all core metrics

---

## 1. L1 SUMMARY DATA API
**Endpoint**: `/api/l1-summary-data`  
**Purpose**: Returns all 5 key metrics in parallel  
**Uses**: All queries 1-5 below

---

## 2. UNIQUE VISITORS METRIC
**Endpoint**: `/api/l1-unique-visitors`  
**Metric**: Total distinct website visitors  
**Business Logic**: Count unique client IDs in date range

```sql
WITH filtered_pageviews AS (
    SELECT 
        td_client_id
    FROM preprocessed.pageviews_partitioned
    WHERE 
        td_client_id IS NOT NULL
        AND td_client_id != ''
        AND time BETWEEN ${fromTimestamp} AND ${toTimestamp}
)
SELECT COUNT(DISTINCT td_client_id) AS unique_visitors
FROM filtered_pageviews
```

**Performance**: Direct query, no caching

---

## 3. TOTAL BOOKINGS METRIC
**Endpoint**: `/api/l1-total-bookings`  
**Metric**: Total completed bookings with confirmation numbers  
**Business Logic**: Count unique confirmation numbers from both confirmation columns

```sql
WITH filtered AS (
    SELECT booking_transaction_confirmationno, booking_transaction_confirmationno_1
    FROM preprocessed.pageviews_partitioned
    WHERE time BETWEEN ${fromTimestamp} AND ${toTimestamp}
      AND (
            (booking_transaction_confirmationno IS NOT NULL AND booking_transaction_confirmationno != '')
         OR (booking_transaction_confirmationno_1 IS NOT NULL AND booking_transaction_confirmationno_1 != '')
      )
),
unified AS (
    SELECT v.confirmation_no
    FROM filtered
    CROSS APPLY (VALUES
        (booking_transaction_confirmationno),
        (booking_transaction_confirmationno_1)
    ) AS v(confirmation_no)
    WHERE v.confirmation_no IS NOT NULL AND v.confirmation_no != ''
)
SELECT COUNT(DISTINCT confirmation_no) AS total_bookings
FROM unified
```

**Performance**: Smart caching enabled

---

## 4. ROOM NIGHTS METRIC
**Endpoint**: `/api/l1-room-nights`  
**Metric**: Total hotel room nights booked  
**Business Logic**: Sum room nights from both night columns with type conversion

```sql
SELECT
  SUM(
    ISNULL(TRY_CAST(booking_bookingwidget_totalnightstay AS FLOAT), 0) +
    ISNULL(TRY_CAST(booking_bookingwidget_totalnightstay_1 AS FLOAT), 0)
  ) as room_nights
FROM preprocessed.pageviews_partitioned
WHERE time BETWEEN ${fromTimestamp} AND ${toTimestamp}
  AND (
    booking_bookingwidget_totalnightstay IS NOT NULL OR
    booking_bookingwidget_totalnightstay_1 IS NOT NULL
  )
```

**Performance**: Smart caching enabled

---

## 5. TOTAL REVENUE METRIC
**Endpoint**: `/api/l1-total-revenue`  
**Metric**: Total booking revenue in USD with multi-currency support  
**Business Logic**: Sum payments with currency conversion using exchange rates

```sql
WITH payment_data AS (
    SELECT
        TRY_CAST(v.payment AS FLOAT) AS payment_amount,
        v.currency_code
    FROM preprocessed.pageviews_partitioned p
    CROSS APPLY (VALUES
        (p.booking_transaction_totalpayment, p.booking_transaction_currencytype),
        (p.booking_transaction_totalpayment_1, p.booking_transaction_currencytype_1)
    ) AS v(payment, currency_code)
    WHERE time BETWEEN ${fromTimestamp} AND ${toTimestamp}
      AND v.payment IS NOT NULL
      AND v.payment != ''
      AND TRY_CAST(v.payment AS FLOAT) > 0
)
SELECT
    SUM(
        payment_data.payment_amount *
        CASE
            WHEN UPPER(payment_data.currency_code) = 'USD' THEN 1.0
            ELSE COALESCE(c.exchange_rate_to_usd, 1.0)
        END
    ) AS total_revenue_usd
FROM payment_data
LEFT JOIN pythia_db.currencies c
    ON UPPER(c.code) = UPPER(payment_data.currency_code)
WHERE payment_data.payment_amount IS NOT NULL
```

**Performance**: Smart caching enabled  
**Complexity**: HIGH - Uses external currency table for exchange rates

---

## 6. AVERAGE BOOKING VALUE (ABV)
**Endpoint**: `/api/l1-abv`  
**Metric**: Revenue per booking (calculated)  
**Business Logic**: Total Revenue ÷ Total Bookings  
**SQL**: Uses results from queries 3 and 5 (no direct SQL)

---

## 7. UNIQUE VISITORS BY CHANNEL CHART
**Endpoint**: `/api/l1-awareness-engagement`  
**Chart**: Bar chart of traffic sources  
**Business Logic**: Classify traffic sources and count unique visitors

```sql
WITH channel_data AS (
  SELECT
    td_client_id,
    CASE
      WHEN utm_source LIKE '%google%' THEN 'Paid Search'
      WHEN utm_source LIKE '%facebook%' THEN 'Social Media'  
      WHEN utm_source LIKE '%email%' THEN 'Email'
      WHEN utm_source IS NOT NULL THEN 'UTM Campaign'
      WHEN td_referrer LIKE '%google.com%' THEN 'Organic Search'
      WHEN td_referrer LIKE '%facebook.com%' THEN 'Social Media'
      WHEN td_referrer IS NULL OR td_referrer = '' THEN 'Direct'
      ELSE 'Other'
    END as channel
  FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
  WHERE time >= ${fromTimestamp} 
    AND time <= ${toTimestamp}
    AND td_client_id IS NOT NULL
),
channel_counts AS (
  SELECT 
    channel,
    COUNT(DISTINCT td_client_id) * 50 as visitors  -- Scale up from 2% sample
  FROM channel_data
  GROUP BY channel
),
total_count AS (
  SELECT SUM(visitors) as total_visitors FROM channel_counts
)
SELECT TOP 10
  cc.channel,
  cc.visitors,
  ROUND((cc.visitors * 100.0 / tc.total_visitors), 1) as percentage
FROM channel_counts cc, total_count tc
WHERE cc.visitors > 0
ORDER BY cc.visitors DESC
```

**Performance**: 2% sampling for speed

---

## 8. LOGGED IN VS LOGGED OUT CHART
**Endpoint**: `/api/l1-awareness-engagement`  
**Chart**: Donut chart of user authentication status  
**Business Logic**: Detect login status from various indicators

```sql
WITH login_status AS (
  SELECT
    td_client_id,
    CASE
      WHEN LOWER(user_userinfo_loginstatus) LIKE '%login%' THEN 'logged_in'
      WHEN LOWER(user_userinfo_loginstatus_1) LIKE '%login%' THEN 'logged_in'
      WHEN LOWER(td_url) LIKE '%/signup.html%' THEN 'logged_in'
      WHEN user_userinfo_memberid IS NOT NULL OR user_userinfo_memberid_1 IS NOT NULL THEN 'logged_in'
      WHEN user_userinfo_loginstatus IS NULL AND user_userinfo_loginstatus_1 IS NULL THEN 'logged_out'
      ELSE 'logged_out'
    END as login_status
  FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
  WHERE time >= ${fromTimestamp}
    AND time <= ${toTimestamp}
    AND td_client_id IS NOT NULL
),
status_summary AS (
  SELECT
    login_status,
    COUNT(DISTINCT td_client_id) * 50 as user_count  -- Scale up from 2% sample
  FROM login_status
  GROUP BY login_status
),
total_users AS (
  SELECT SUM(user_count) as total FROM status_summary
)
SELECT
  ss.login_status,
  ss.user_count as count,
  ROUND((ss.user_count * 100.0 / tu.total), 1) as percentage
FROM status_summary ss, total_users tu
```

**Performance**: 2% sampling for speed

---

## 9. BOOKING FUNNEL CHART
**Endpoint**: `/api/l1-conversions`  
**Chart**: Funnel chart showing conversion stages  
**Business Logic**: Track user progression through booking steps

```sql
SELECT 
  COUNT(DISTINCT td_client_id) as total_visitors,
  COUNT(DISTINCT CASE WHEN booking_bookingwidget_arrivaldate_1 IS NOT NULL 
                       AND booking_bookingwidget_arrivaldate_1 != '' 
                       THEN td_client_id END) as search_users,
  COUNT(DISTINCT CASE WHEN booking_bookingwidget_adultroom_1 IS NOT NULL 
                       AND booking_bookingwidget_adultroom_1 != '' 
                       THEN td_client_id END) as selection_users,
  COUNT(DISTINCT CASE WHEN booking_transaction_totalpayment_1 IS NOT NULL 
                       AND booking_transaction_totalpayment_1 != '' 
                       AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0 
                       THEN td_client_id END) as payment_users,
  COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL 
                       AND booking_transaction_confirmationno_1 != '' 
                       THEN td_client_id END) as confirmed_users
FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
WHERE time >= ${fromTimestamp}
  AND time <= ${toTimestamp}
  AND td_client_id IS NOT NULL
```

**Performance**: 2% sampling, single query optimization

---

## 10. BOOKING REVENUE TRENDS CHART
**Endpoint**: `/api/l1-conversions`  
**Chart**: Line chart of monthly revenue and bookings  
**Business Logic**: Monthly revenue trends with booking counts

```sql
SELECT
  YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as year,
  MONTH(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as month,
  SUM(TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT)) as revenue,
  COUNT(DISTINCT booking_transaction_confirmationno_1) as bookings
FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
WHERE time >= ${fromTimestamp}
  AND time <= ${toTimestamp}
  AND booking_transaction_confirmationno_1 IS NOT NULL
  AND booking_transaction_totalpayment_1 IS NOT NULL
  AND TRY_CAST(booking_transaction_totalpayment_1 AS FLOAT) > 0
GROUP BY YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)),
         MONTH(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE))
ORDER BY year, month
```

**Performance**: 2% sampling, simplified (no currency conversion)

---

## 11. NPS SCORES CHART
**Endpoint**: `/api/l1-stay-poststay`  
**Chart**: Bar chart of quarterly satisfaction scores  
**Business Logic**: Proxy NPS using booking completion rates

```sql
SELECT
  DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as quarter,
  YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as year,
  COUNT(DISTINCT td_client_id) * 50 as estimated_customers, -- Scale up from 2% sample
  COUNT(DISTINCT CASE WHEN booking_transaction_confirmationno_1 IS NOT NULL 
                        AND booking_transaction_confirmationno_1 != '' 
                        THEN td_client_id END) * 50 as estimated_satisfied
FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
WHERE time >= ${fromTimestamp}
  AND time <= ${toTimestamp}
  AND td_client_id IS NOT NULL
GROUP BY YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)), 
         DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE))
HAVING COUNT(DISTINCT td_client_id) > 0
ORDER BY year, quarter
```

**Performance**: 2% sampling, quarterly aggregation

---

## 12. RE-BOOKING RATES CHART
**Endpoint**: `/api/l1-stay-poststay`  
**Chart**: Line chart of customer retention rates  
**Business Logic**: Track customers with multiple bookings

```sql
WITH customer_bookings AS (
  SELECT
    DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as quarter,
    YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)) as year,
    td_client_id,
    COUNT(DISTINCT booking_transaction_confirmationno_1) as booking_count
  FROM preprocessed.pageviews_partitioned TABLESAMPLE (2 PERCENT)
  WHERE time >= ${fromTimestamp}
    AND time <= ${toTimestamp}
    AND booking_transaction_confirmationno_1 IS NOT NULL
    AND booking_transaction_confirmationno_1 != ''
    AND td_client_id IS NOT NULL
    AND td_client_id != ''
  GROUP BY YEAR(CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)),
           DATEPART(QUARTER, CAST(DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01') AS DATE)),
           td_client_id
  HAVING COUNT(DISTINCT booking_transaction_confirmationno_1) > 0
)
SELECT 
  CONCAT('Q', quarter, ' ', year) as period,
  year,
  quarter,
  COUNT(DISTINCT td_client_id) * 50 as estimated_customers, -- Scale up from 2% sample
  COUNT(DISTINCT CASE WHEN booking_count > 1 THEN td_client_id END) * 50 as estimated_repeat_customers,
  CASE 
    WHEN COUNT(DISTINCT td_client_id) > 0 
    THEN ROUND((COUNT(DISTINCT CASE WHEN booking_count > 1 THEN td_client_id END) * 100.0 / COUNT(DISTINCT td_client_id)), 1)
    ELSE 0 
  END as rebooking_rate
FROM customer_bookings
GROUP BY year, quarter
HAVING COUNT(DISTINCT td_client_id) > 0
ORDER BY year, quarter
```

**Performance**: CTE for complex customer analysis

---

## 13. DATE RANGES HELPER
**Endpoint**: `/api/l1-date-ranges`  
**Purpose**: Get available data range in database  
**Business Logic**: Find min/max timestamps

```sql
SELECT 
  MIN(time) as min_time,
  MAX(time) as max_time,
  COUNT(*) as total_records
FROM preprocessed.pageviews_partitioned 
WHERE time IS NOT NULL
```

**Performance**: Simple aggregation query

---

## PERFORMANCE OPTIMIZATIONS

### Sampling Strategy
- **Chart Queries**: Use 2% TABLESAMPLE for speed
- **Scale Factor**: Multiply results by 50 to estimate full dataset
- **Target Response**: <1000ms for chart queries

### Caching Strategy
- **Key Metrics**: Smart caching with chunk aggregation
- **Chart Data**: Direct queries (no caching for reliability)

### Index Usage
- **Primary Index**: `[time, td_client_id]` for filtering
- **Partitioning**: Table is partitioned by time for performance

### Data Types
- **Timestamps**: Unix timestamps as BIGINT
- **Payments**: nvarchar converted with TRY_CAST
- **Date Conversion**: DATEADD(SECOND, CAST([time] AS BIGINT), '1970-01-01')

---

## BUSINESS METRICS SUMMARY

1. **Unique Visitors**: Website traffic volume
2. **Total Bookings**: Conversion success
3. **Room Nights**: Revenue potential 
4. **Total Revenue**: Financial performance (USD)
5. **ABV**: Revenue efficiency per booking
6. **Channel Distribution**: Marketing effectiveness
7. **Login Status**: User engagement
8. **Booking Funnel**: Conversion optimization
9. **Revenue Trends**: Business growth patterns
10. **NPS Proxy**: Customer satisfaction
11. **Re-booking Rate**: Customer retention

---

## ERROR HANDLING
- NULL value protection with ISNULL/COALESCE
- Type conversion safety with TRY_CAST
- Empty string filtering
- Graceful degradation on query failures

---

*Generated: 2025-09-12*  
*Database: Azure MSSQL pythia*  
*Backend: Node.js + Prisma + Express*
