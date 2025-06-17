-- DANGER: This script will completely reset the database
-- Only run this if you want to start completely fresh
-- This script is commented out for safety

/*
DO $$ 
BEGIN
    RAISE NOTICE '⚠️  WARNING: This will delete ALL data and reset the database!';
    RAISE NOTICE 'This script is intentionally commented out for safety';
    
    -- Drop all policies
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    DROP POLICY IF EXISTS "Users can create own documents" ON documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON documents;
    DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
    DROP POLICY IF EXISTS "Users can view own document versions" ON document_versions;
    DROP POLICY IF EXISTS "Users can create document versions" ON document_versions;
    DROP POLICY IF EXISTS "Users can view own suggestions" ON suggestions;
    DROP POLICY IF EXISTS "Users can create suggestions" ON suggestions;
    DROP POLICY IF EXISTS "Users can delete own suggestions" ON suggestions;
    
    -- Drop trigger and function
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    DROP FUNCTION IF EXISTS public.handle_new_user();
    
    -- Drop tables in correct order (respecting foreign keys)
    DROP TABLE IF EXISTS suggestions CASCADE;
    DROP TABLE IF EXISTS document_versions CASCADE;
    DROP TABLE IF EXISTS documents CASCADE;
    DROP TABLE IF EXISTS users CASCADE;
    
    RAISE NOTICE '🗑️  Database reset complete - all tables and policies dropped';
END $$;
*/

DO $$ 
BEGIN
    RAISE NOTICE 'Reset script is commented out for safety';
    RAISE NOTICE 'Uncomment the DO block above if you want to completely reset the database';
END $$;
