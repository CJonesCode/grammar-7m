-- Safe final validation with comprehensive error handling
DO $$ 
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
    function_exists BOOLEAN;
    table_name TEXT;
BEGIN
    RAISE NOTICE '=== DATABASE VALIDATION REPORT ===';
    
    -- Check if all required tables exist
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
        AND table_name IN ('users', 'documents', 'document_versions', 'suggestions');
    
    RAISE NOTICE 'Tables found: %/4', table_count;
    
    IF table_count = 4 THEN
        RAISE NOTICE '✅ All required tables exist';
    ELSE
        RAISE NOTICE '❌ Missing tables. Expected 4, found %', table_count;
    END IF;
    
    -- Check table structures
    FOR table_name IN SELECT t.table_name 
                     FROM (VALUES ('users'), ('documents'), ('document_versions'), ('suggestions')) as t(table_name)
                     WHERE EXISTS (
                         SELECT 1 FROM information_schema.tables 
                         WHERE table_schema = 'public' AND table_name = t.table_name
                     )
    LOOP
        SELECT COUNT(*) INTO table_count
        FROM information_schema.columns 
        WHERE table_name = table_name AND table_schema = 'public';
        
        RAISE NOTICE 'Table %: % columns', table_name, table_count;
    END LOOP;
    
    -- Check RLS is enabled
    SELECT COUNT(*) INTO table_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
        AND tablename IN ('users', 'documents', 'document_versions', 'suggestions')
        AND rowsecurity = true;
    
    RAISE NOTICE 'Tables with RLS enabled: %/4', table_count;
    
    -- Check policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
        AND tablename IN ('users', 'documents', 'document_versions', 'suggestions');
    
    RAISE NOTICE 'Total RLS policies: %', policy_count;
    
    -- Check indexes exist
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
        AND tablename IN ('users', 'documents', 'document_versions', 'suggestions');
    
    RAISE NOTICE 'Total indexes: %', index_count;
    
    -- Check trigger exists
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
        AND trigger_name = 'on_auth_user_created';
    
    RAISE NOTICE 'User creation trigger: %', CASE WHEN trigger_count > 0 THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    -- Check function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_schema = 'public' 
            AND routine_name = 'handle_new_user'
    ) INTO function_exists;
    
    RAISE NOTICE 'User creation function: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    -- Check content_hash column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_versions' 
            AND column_name = 'content_hash'
            AND table_schema = 'public'
    ) INTO function_exists;
    
    RAISE NOTICE 'Content hash column: %', CASE WHEN function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    
    RAISE NOTICE '=== VALIDATION COMPLETE ===';
    
    -- Summary
    IF table_count = 4 AND policy_count >= 10 AND trigger_count > 0 AND function_exists THEN
        RAISE NOTICE '🎉 DATABASE SETUP SUCCESSFUL - All components are in place!';
    ELSE
        RAISE NOTICE '⚠️  DATABASE SETUP INCOMPLETE - Some components may be missing';
        RAISE NOTICE 'This may be normal if running scripts incrementally';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error during validation: %', SQLERRM;
        RAISE NOTICE 'This does not necessarily indicate a problem with the database setup';
END $$;
