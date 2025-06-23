-- Final validation of the database schema
SELECT 'Tables created successfully' as status;

-- Verify all tables exist
SELECT table_name, 
       (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM (VALUES ('users'), ('documents'), ('document_versions'), ('suggestions')) as t(table_name)
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
);

-- Verify RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('users', 'documents', 'document_versions', 'suggestions');

-- Verify policies exist
SELECT tablename, count(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('users', 'documents', 'document_versions', 'suggestions')
GROUP BY tablename;

-- Verify indexes exist
SELECT tablename, count(*) as index_count
FROM pg_indexes 
WHERE schemaname = 'public'
    AND tablename IN ('users', 'documents', 'document_versions', 'suggestions')
GROUP BY tablename;

-- Verify trigger exists
SELECT count(*) as trigger_count
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
    AND trigger_name = 'on_auth_user_created';

SELECT 'Database validation complete' as status;
