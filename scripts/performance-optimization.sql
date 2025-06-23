-- Performance Optimization Script for Grammar-7m
-- Run this after the main setup to improve query performance

-- 1. Create composite index for dashboard queries (CRITICAL - fixes 815ms dashboard load)
-- This will dramatically improve the dashboard query performance
CREATE INDEX IF NOT EXISTS idx_documents_user_last_edited_perf 
ON documents (user_id, last_edited_at DESC) 
WHERE user_id IS NOT NULL;

-- 2. Create covering index for dashboard queries (includes all needed columns)
CREATE INDEX IF NOT EXISTS idx_documents_dashboard_covering 
ON documents (user_id, last_edited_at DESC) 
INCLUDE (id, title, readability_score) 
WHERE user_id IS NOT NULL;

-- 3. Create partial index for active documents only
CREATE INDEX IF NOT EXISTS idx_documents_active 
ON documents (user_id, last_edited_at DESC) 
WHERE content != '' OR title != 'Untitled Document';

-- 4. Add GIN index for readability_score JSONB queries
CREATE INDEX IF NOT EXISTS idx_documents_readability_gin 
ON documents USING GIN (readability_score);

-- 5. Optimize suggestions table for faster lookups
CREATE INDEX IF NOT EXISTS idx_suggestions_document_type 
ON suggestions (document_id, suggestion_type, start_index);

-- 6. Add index for document versions by document and creation time
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_created 
ON document_versions (document_id, created_at DESC);

-- 7. Analyze tables to update statistics
ANALYZE documents;
ANALYZE suggestions;
ANALYZE document_versions;
ANALYZE users;

-- 8. Create a materialized view for dashboard performance (optional)
-- This can be refreshed periodically for very large datasets
-- CREATE MATERIALIZED VIEW dashboard_documents AS
-- SELECT 
--   id, title, user_id, last_edited_at, 
--   readability_score->>'wordCount' as word_count,
--   readability_score->>'fleschReadingEase' as readability_score
-- FROM documents 
-- WHERE user_id IS NOT NULL;

-- 9. Add function to refresh materialized view (if using)
-- CREATE OR REPLACE FUNCTION refresh_dashboard_documents()
-- RETURNS void AS $$
-- BEGIN
--   REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_documents;
-- END;
-- $$ LANGUAGE plpgsql;

-- 10. Set up automatic vacuum and analyze
-- This should be configured in postgresql.conf, but here's a reminder:
-- autovacuum_vacuum_scale_factor = 0.1
-- autovacuum_analyze_scale_factor = 0.05

-- 11. Create a function to get documents with better performance
CREATE OR REPLACE FUNCTION get_user_documents(user_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  title TEXT,
  readability_score JSONB,
  last_edited_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.readability_score,
    d.last_edited_at
  FROM documents d
  WHERE d.user_id = user_uuid
  ORDER BY d.last_edited_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_user_documents(UUID, INTEGER) TO authenticated;

-- 13. Create index for the function
CREATE INDEX IF NOT EXISTS idx_documents_user_id_btree 
ON documents USING BTREE (user_id);

-- 14. Add index for content length queries (for performance monitoring)
CREATE INDEX IF NOT EXISTS idx_documents_content_length 
ON documents (user_id, length(content)) 
WHERE content IS NOT NULL;

-- Performance monitoring queries (run these to check performance)
-- SELECT schemaname, tablename, attname, n_distinct, correlation 
-- FROM pg_stats 
-- WHERE tablename IN ('documents', 'suggestions', 'document_versions')
-- ORDER BY tablename, attname;

-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch
-- FROM pg_stat_user_indexes 
-- WHERE tablename IN ('documents', 'suggestions', 'document_versions')
-- ORDER BY idx_scan DESC;

-- SELECT 
--   query,
--   calls,
--   total_time,
--   mean_time,
--   rows
-- FROM pg_stat_statements 
-- WHERE query LIKE '%documents%'
-- ORDER BY total_time DESC
-- LIMIT 10; 