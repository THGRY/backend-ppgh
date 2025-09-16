/**
 * Complete end-to-end database structure analysis
 * Exports all tables, columns, data types, constraints, and sample data to JSON
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function checkTablesComplete() {
  const analysisResult = {
    timestamp: new Date().toISOString(),
    totalTables: 0,
    tables: [],
    errors: [],
    summary: {
      pageviewsTables: [],
      bookingRelatedTables: [],
      totalRecords: 0
    }
  };

  try {
    console.log('🔍 Starting complete database analysis...');
    
    // Get all tables in the database
    const tables = await prisma.$queryRaw`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_SCHEMA, TABLE_NAME
    `;
    
    analysisResult.totalTables = tables.length;
    console.log(`📊 Found ${tables.length} tables - analyzing each one...`);
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const fullName = `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`;
      const tableResult = {
        index: i + 1,
        schema: table.TABLE_SCHEMA,
        name: table.TABLE_NAME,
        fullName: fullName,
        type: table.TABLE_TYPE,
        columns: [],
        recordCount: 0,
        sampleData: [],
        isPageviewsTable: false,
        bookingAnalysis: null,
        errors: []
      };
      
      console.log(`  Processing ${i + 1}/${tables.length}: ${fullName}`);
      
      try {
        // Get all columns for this table
        const columns = await prisma.$queryRaw`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            COLUMN_DEFAULT,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE,
            ORDINAL_POSITION
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = ${table.TABLE_SCHEMA}
          AND TABLE_NAME = ${table.TABLE_NAME}
          ORDER BY ORDINAL_POSITION
        `;
        
        // Process columns
        tableResult.columns = columns.map(col => {
          let typeInfo = col.DATA_TYPE;
          if (col.CHARACTER_MAXIMUM_LENGTH && col.CHARACTER_MAXIMUM_LENGTH !== -1) {
            typeInfo += `(${col.CHARACTER_MAXIMUM_LENGTH})`;
          } else if (col.CHARACTER_MAXIMUM_LENGTH === -1) {
            typeInfo += '(MAX)';
          } else if (col.NUMERIC_PRECISION) {
            typeInfo += `(${col.NUMERIC_PRECISION}${col.NUMERIC_SCALE ? ',' + col.NUMERIC_SCALE : ''})`;
          }
          
          return {
            position: col.ORDINAL_POSITION,
            name: col.COLUMN_NAME,
            dataType: col.DATA_TYPE,
            typeInfo: typeInfo,
            isNullable: col.IS_NULLABLE === 'YES',
            defaultValue: col.COLUMN_DEFAULT,
            maxLength: col.CHARACTER_MAXIMUM_LENGTH,
            precision: col.NUMERIC_PRECISION,
            scale: col.NUMERIC_SCALE
          };
        });
        
        // Get record count with timeout protection
        try {
          const isLargeTable = table.TABLE_NAME.toLowerCase().includes('pageview') || 
                              table.TABLE_NAME.toLowerCase().includes('log') ||
                              table.TABLE_NAME.toLowerCase().includes('event');
          
          if (isLargeTable) {
            // For potentially large tables, use approximation
            const approxCountQuery = `
              SELECT CAST(p.rows AS BIGINT) as record_count
              FROM sys.tables t
              INNER JOIN sys.partitions p ON t.object_id = p.object_id
              INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
              WHERE t.name = '${table.TABLE_NAME}' 
              AND s.name = '${table.TABLE_SCHEMA}'
              AND p.index_id IN (0,1)
            `;
            const countResult = await Promise.race([
              prisma.$queryRawUnsafe(approxCountQuery),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);
            
            if (countResult && countResult[0]) {
              tableResult.recordCount = Number(countResult[0].record_count);
              tableResult.isApproximateCount = true;
            } else {
              tableResult.recordCount = 0;
              tableResult.errors.push('Could not get row count');
            }
          } else {
            // For smaller tables, use exact count with timeout
            const countQuery = `SELECT COUNT(*) as record_count FROM [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]`;
            const countResult = await Promise.race([
              prisma.$queryRawUnsafe(countQuery),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Count timeout')), 15000))
            ]);
            tableResult.recordCount = Number(countResult[0].record_count);
          }
          
          analysisResult.summary.totalRecords += tableResult.recordCount;
        } catch (countError) {
          if (countError.message === 'Count timeout' || countError.message === 'Timeout') {
            tableResult.errors.push(`Count timeout - table too large`);
            tableResult.recordCount = -1; // Indicates timeout
          } else {
            tableResult.errors.push(`Count error: ${countError.message}`);
          }
        }
        
        // Get sample data if records exist (with timeout protection)
        if (tableResult.recordCount > 0) {
          try {
            // Get first 5 columns for sample data (reduced from 10 for speed)
            const columnNames = tableResult.columns.slice(0, 5).map(col => `[${col.name}]`);
            const sampleQuery = `SELECT TOP 2 ${columnNames.join(', ')} FROM [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]`;
            
            const sampleData = await Promise.race([
              prisma.$queryRawUnsafe(sampleQuery),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Sample timeout')), 8000))
            ]);
            
            tableResult.sampleData = sampleData.map(row => {
              const processedRow = {};
              Object.keys(row).forEach(key => {
                let value = row[key];
                if (value === null) {
                  value = null;
                } else if (typeof value === 'string' && value.length > 100) {
                  value = value.substring(0, 100) + '...';
                } else if (value instanceof Date) {
                  value = value.toISOString();
                } else if (typeof value === 'bigint') {
                  value = value.toString();
                }
                processedRow[key] = value;
              });
              return processedRow;
            });
            
          } catch (sampleError) {
            if (sampleError.message === 'Sample timeout') {
              tableResult.errors.push(`Sample data timeout - table too large`);
            } else {
              tableResult.errors.push(`Sample data error: ${sampleError.message}`);
            }
          }
        }
        
        // Special analysis for pageviews tables
        if (table.TABLE_NAME.toLowerCase().includes('pageview')) {
          tableResult.isPageviewsTable = true;
          analysisResult.summary.pageviewsTables.push(fullName);
          
          try {
            // Check for booking-related columns
            const bookingColumns = tableResult.columns.filter(col => 
              col.name.toLowerCase().includes('booking') || 
              col.name.toLowerCase().includes('confirmation')
            );
            
            if (bookingColumns.length > 0) {
              tableResult.bookingAnalysis = {
                bookingColumns: bookingColumns.map(col => ({
                  name: col.name,
                  dataType: col.dataType
                })),
                recordsWithBookingData: 0
              };
              
              // Check for non-null booking data (with timeout)
              if (tableResult.recordCount > 0 && tableResult.recordCount !== -1) {
                try {
                  const bookingDataQuery = `
                    SELECT COUNT(*) as booking_records
                    FROM [${table.TABLE_SCHEMA}].[${table.TABLE_NAME}]
                    WHERE [booking_transaction_confirmationno] IS NOT NULL
                       OR [booking_transaction_confirmationno_1] IS NOT NULL
                  `;
                  const bookingDataCount = await Promise.race([
                    prisma.$queryRawUnsafe(bookingDataQuery),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Booking count timeout')), 10000))
                  ]);
                  tableResult.bookingAnalysis.recordsWithBookingData = Number(bookingDataCount[0].booking_records);
                } catch (bookingCountError) {
                  if (bookingCountError.message === 'Booking count timeout') {
                    tableResult.errors.push(`Booking data count timeout - table too large`);
                  } else {
                    tableResult.errors.push(`Booking data count error: ${bookingCountError.message}`);
                  }
                }
              }
            }
          } catch (analysisError) {
            tableResult.errors.push(`Pageviews analysis error: ${analysisError.message}`);
          }
        }
        
        // Check if table has booking-related data
        const hasBookingColumns = tableResult.columns.some(col => 
          col.name.toLowerCase().includes('booking') || 
          col.name.toLowerCase().includes('confirmation') ||
          col.name.toLowerCase().includes('reservation')
        );
        
        if (hasBookingColumns) {
          analysisResult.summary.bookingRelatedTables.push(fullName);
        }
        
      } catch (tableError) {
        tableResult.errors.push(`Table analysis error: ${tableError.message}`);
        analysisResult.errors.push(`Error analyzing ${fullName}: ${tableError.message}`);
      }
      
      analysisResult.tables.push(tableResult);
    }
    
    // Write results to JSON file
    const outputFile = 'database-analysis-complete.json';
    fs.writeFileSync(outputFile, JSON.stringify(analysisResult, null, 2));
    
    console.log('✅ Analysis complete!');
    console.log(`📁 Results saved to: ${outputFile}`);
    console.log(`📊 Summary:`);
    console.log(`   - Total tables: ${analysisResult.totalTables}`);
    console.log(`   - Total records: ${analysisResult.summary.totalRecords.toLocaleString()}`);
    console.log(`   - Pageviews tables: ${analysisResult.summary.pageviewsTables.length}`);
    console.log(`   - Tables with booking data: ${analysisResult.summary.bookingRelatedTables.length}`);
    if (analysisResult.errors.length > 0) {
      console.log(`   - Errors encountered: ${analysisResult.errors.length}`);
    }
    
  } catch (error) {
    analysisResult.errors.push(`Global error: ${error.message}`);
    console.error('❌ Error during database analysis:', error.message);
    
    // Still save partial results
    const outputFile = 'database-analysis-partial.json';
    fs.writeFileSync(outputFile, JSON.stringify(analysisResult, null, 2));
    console.log(`📁 Partial results saved to: ${outputFile}`);
  } finally {
    await prisma.$disconnect();
  }
}

checkTablesComplete().catch(console.error);
