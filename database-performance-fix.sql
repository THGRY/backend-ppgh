-- =================================================================
-- DATABASE PERFORMANCE FIX FOR pageviews_partitioned TABLE
-- =================================================================
-- 
-- This script creates the essential indexes needed to restore
-- performance for the L1 Dashboard APIs
--
-- PROBLEM: 65+ million record table with no proper indexes
-- SOLUTION: Add clustered index and key non-clustered indexes
--
-- ESTIMATED IMPROVEMENT: 10-30x faster queries
-- =================================================================

-- Check current table size and structure
SELECT 
    COUNT(*) as total_records,
    MIN(time) as min_time,
    MAX(time) as max_time
FROM preprocessed.pageviews_partitioned;

-- Check if indexes already exist
SELECT 
    i.name as index_name,
    i.type_desc as index_type,
    i.is_primary_key,
    i.is_unique,
    STRING_AGG(c.name, ', ') as columns
FROM sys.indexes i
INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
INNER JOIN sys.objects o ON i.object_id = o.object_id
INNER JOIN sys.schemas s ON o.schema_id = s.schema_id
WHERE s.name = 'preprocessed' 
  AND o.name = 'pageviews_partitioned'
GROUP BY i.name, i.type_desc, i.is_primary_key, i.is_unique
ORDER BY i.index_id;

-- =================================================================
-- 1. CRITICAL: ADD CLUSTERED INDEX ON TIME COLUMN
-- =================================================================
-- This is the most important fix - orders data by time for fast date filtering

CREATE CLUSTERED INDEX IX_pageviews_partitioned_time_clustered 
ON preprocessed.pageviews_partitioned(time);

-- =================================================================
-- 2. HIGH PRIORITY: ADD NON-CLUSTERED INDEXES FOR KEY QUERIES
-- =================================================================

-- Index for unique visitor queries (used in every API call)
CREATE NONCLUSTERED INDEX IX_pageviews_partitioned_client_time 
ON preprocessed.pageviews_partitioned(td_client_id, time)
WHERE td_client_id IS NOT NULL AND td_client_id != '';

-- Index for booking queries (confirmation number 1)
CREATE NONCLUSTERED INDEX IX_pageviews_partitioned_booking1_time 
ON preprocessed.pageviews_partitioned(booking_transaction_confirmationno, time)
WHERE booking_transaction_confirmationno IS NOT NULL AND booking_transaction_confirmationno != '';

-- Index for booking queries (confirmation number 2)  
CREATE NONCLUSTERED INDEX IX_pageviews_partitioned_booking2_time 
ON preprocessed.pageviews_partitioned(booking_transaction_confirmationno_1, time)
WHERE booking_transaction_confirmationno_1 IS NOT NULL AND booking_transaction_confirmationno_1 != '';

-- Index for payment/revenue queries
CREATE NONCLUSTERED INDEX IX_pageviews_partitioned_payment_time 
ON preprocessed.pageviews_partitioned(booking_transaction_totalpayment, booking_transaction_currencytype, time)
WHERE booking_transaction_totalpayment IS NOT NULL AND booking_transaction_totalpayment != '';

-- Index for room nights queries
CREATE NONCLUSTERED INDEX IX_pageviews_partitioned_nights_time 
ON preprocessed.pageviews_partitioned(booking_bookingwidget_totalnightstay, time)
WHERE booking_bookingwidget_totalnightstay IS NOT NULL AND booking_bookingwidget_totalnightstay != '';

-- =================================================================
-- 3. MEDIUM PRIORITY: UPDATE TABLE STATISTICS
-- =================================================================
-- This helps SQL Server choose optimal query execution plans

UPDATE STATISTICS preprocessed.pageviews_partitioned WITH FULLSCAN;

-- =================================================================
-- 4. VERIFICATION: CHECK INDEX CREATION
-- =================================================================

-- Verify all indexes were created successfully
SELECT 
    i.name as index_name,
    i.type_desc as index_type,
    i.is_primary_key,
    i.is_unique,
    s.user_seeks,
    s.user_scans,
    s.user_lookups,
    s.user_updates,
    ps.avg_fragmentation_in_percent
FROM sys.indexes i
LEFT JOIN sys.dm_db_index_usage_stats s ON i.object_id = s.object_id AND i.index_id = s.index_id
LEFT JOIN sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('preprocessed.pageviews_partitioned'), NULL, NULL, 'LIMITED') ps 
    ON i.object_id = ps.object_id AND i.index_id = ps.index_id
INNER JOIN sys.objects o ON i.object_id = o.object_id
INNER JOIN sys.schemas sc ON o.schema_id = sc.schema_id
WHERE sc.name = 'preprocessed' 
  AND o.name = 'pageviews_partitioned'
  AND i.index_id > 0  -- Exclude heap
ORDER BY i.index_id;

-- =================================================================
-- 5. PERFORMANCE TEST: VERIFY IMPROVEMENT
-- =================================================================

-- Test 1: Simple count (should be <1 second after indexing)
SELECT COUNT(*) as total_records FROM preprocessed.pageviews_partitioned;

-- Test 2: Date range query (should be <500ms after indexing)
SELECT COUNT(*) as records_in_range 
FROM preprocessed.pageviews_partitioned
WHERE time >= 1719792000 AND time <= 1719878399; -- 1 day in July 2024

-- Test 3: Unique visitors (should be <200ms after indexing)
SELECT COUNT(DISTINCT td_client_id) as unique_visitors
FROM preprocessed.pageviews_partitioned
WHERE time >= 1719792000 AND time <= 1719878399
  AND td_client_id IS NOT NULL AND td_client_id != '';

-- Test 4: Booking count (should be <500ms after indexing)
SELECT COUNT(DISTINCT confirmation_no) as total_bookings
FROM (
    SELECT booking_transaction_confirmationno as confirmation_no
    FROM preprocessed.pageviews_partitioned
    WHERE time >= 1719792000 AND time <= 1719878399
      AND booking_transaction_confirmationno IS NOT NULL
      AND booking_transaction_confirmationno != ''
    
    UNION
    
    SELECT booking_transaction_confirmationno_1 as confirmation_no
    FROM preprocessed.pageviews_partitioned
    WHERE time >= 1719792000 AND time <= 1719878399
      AND booking_transaction_confirmationno_1 IS NOT NULL
      AND booking_transaction_confirmationno_1 != ''
) as all_confirmations;

-- =================================================================
-- EXPECTED RESULTS AFTER INDEX CREATION:
-- =================================================================
-- 
-- Before Indexes:
-- - Simple COUNT: 5+ seconds
-- - Date range: 2+ seconds  
-- - Unique visitors: 1+ seconds
-- - API calls: 15-30 seconds
--
-- After Indexes:
-- - Simple COUNT: <1 second
-- - Date range: <500ms
-- - Unique visitors: <200ms  
-- - API calls: 2-5 seconds
--
-- This represents a 10-30x performance improvement!
-- =================================================================
