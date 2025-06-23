-- =============================================================================
-- COMPREHENSIVE PERFORMANCE OPTIMIZATION VERIFICATION SCRIPT
-- Run this single script to verify all optimizations are working
-- =============================================================================

-- Simple verification queries that will work with any PostgreSQL setup

-- 1. Check if the optimized function exists
SELECT 
    '1. FUNCTION VERIFICATION' as section,
    'get_user_documents function' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_user_documents' 
            AND routine_schema = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING - Run performance-optimization.sql first!'
    END as status,
    'Function needed for optimized dashboard queries' as details;

-- 2. Check if critical indexes exist
SELECT 
    '2. INDEX VERIFICATION' as section,
    'Critical performance indexes' as item,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname IN (
                'idx_documents_user_last_edited_perf',
                'idx_documents_dashboard_covering',
                'idx_documents_user_last_edited'
            )
        ) = 3 THEN '✅ ALL 3 EXIST'
        ELSE '❌ MISSING - Run performance-optimization.sql first!'
    END as status,
    'Indexes needed for dashboard and document queries' as details;

-- 3. Show index details
SELECT 
    '3. INDEX DETAILS' as section,
    indexname as item,
    'EXISTS' as status,
    split_part(indexdef, '(', 1) as details
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_documents_user_last_edited_perf',
    'idx_documents_dashboard_covering',
    'idx_documents_user_last_edited'
)
ORDER BY indexname;

-- 4. Check index usage statistics
SELECT 
    '4. INDEX USAGE' as section,
    indexrelname as item,
    CASE 
        WHEN idx_scan > 0 THEN '✅ USED ' || idx_scan || ' times'
        ELSE '⚠️ NOT USED YET'
    END as status,
    'Scans: ' || idx_scan || ', Read: ' || idx_tup_read || ', Fetched: ' || idx_tup_fetch as details
FROM pg_stat_user_indexes 
WHERE relname = 'documents'
AND indexrelname IN (
    'idx_documents_user_last_edited_perf',
    'idx_documents_dashboard_covering',
    'idx_documents_user_last_edited'
)
ORDER BY idx_scan DESC;

-- 5. Check table statistics
SELECT 
    '5. TABLE STATISTICS' as section,
    attname as item,
    'ANALYZED' as status,
    'Distinct values: ' || n_distinct || ', Correlation: ' || correlation as details
FROM pg_stats 
WHERE tablename = 'documents'
AND attname IN ('user_id', 'last_edited_at', 'id', 'title', 'readability_score')
ORDER BY attname;

-- 6. RLS Policy Verification
SELECT 
    '6. SECURITY VERIFICATION' as section,
    'RLS policies' as item,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'documents'
        ) = 4 THEN '✅ ALL 4 CONFIGURED'
        ELSE '❌ MISSING POLICIES'
    END as status,
    'Row-level security policies for user isolation' as details;

-- 7. Show RLS policy details
SELECT 
    '7. POLICY DETAILS' as section,
    policyname as item,
    'CONFIGURED' as status,
    COALESCE(qual, 'No qualifier') as details
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'documents'
ORDER BY policyname;

-- 8. Overall deployment status
SELECT 
    '8. DEPLOYMENT STATUS' as section,
    'Optimization readiness' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_user_documents' 
            AND routine_schema = 'public'
        ) AND (
            SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname IN (
                'idx_documents_user_last_edited_perf',
                'idx_documents_dashboard_covering',
                'idx_documents_user_last_edited'
            )
        ) = 3 THEN '✅ READY FOR DEPLOYMENT'
        ELSE '❌ NOT READY - Run performance-optimization.sql first'
    END as status,
    'Expected: Dashboard 96ms→<50ms, Documents 271ms→<30ms' as details; 