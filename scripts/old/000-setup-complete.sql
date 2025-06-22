-- Complete database setup script that handles all scenarios
-- This script is idempotent and can be run multiple times safely

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: CREATE TABLES AND BASIC STRUCTURE
-- =============================================================================

-- Create users table if it doesn't exist (extends Supabase auth.users)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        CREATE TABLE users (
            id UUID REFERENCES auth.users(id) PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            full_name TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created users table';
    ELSE
        RAISE NOTICE 'Users table already exists';
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'full_name') THEN
            ALTER TABLE users ADD COLUMN full_name TEXT;
            RAISE NOTICE 'Added full_name column to users table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'created_at') THEN
            ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added created_at column to users table';
        END IF;
    END IF;
END $$;

-- Create documents table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
        CREATE TABLE documents (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
            title TEXT NOT NULL DEFAULT 'Untitled Document',
            content TEXT DEFAULT '',
            readability_score JSONB DEFAULT '{}',
            last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created documents table';
    ELSE
        RAISE NOTICE 'Documents table already exists';
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'readability_score') THEN
            ALTER TABLE documents ADD COLUMN readability_score JSONB DEFAULT '{}';
            RAISE NOTICE 'Added readability_score column to documents table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'last_edited_at') THEN
            ALTER TABLE documents ADD COLUMN last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added last_edited_at column to documents table';
        END IF;
    END IF;
END $$;

-- Create document_versions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_versions') THEN
        CREATE TABLE document_versions (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
            content_snapshot TEXT NOT NULL,
            readability_score JSONB DEFAULT '{}',
            content_hash TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created document_versions table';
    ELSE
        RAISE NOTICE 'Document_versions table already exists';
        
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_versions' AND column_name = 'content_hash') THEN
            ALTER TABLE document_versions ADD COLUMN content_hash TEXT;
            RAISE NOTICE 'Added content_hash column to document_versions table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_versions' AND column_name = 'readability_score') THEN
            ALTER TABLE document_versions ADD COLUMN readability_score JSONB DEFAULT '{}';
            RAISE NOTICE 'Added readability_score column to document_versions table';
        END IF;
    END IF;
END $$;

-- Create suggestions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suggestions') THEN
        CREATE TABLE suggestions (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
            start_index INTEGER NOT NULL,
            end_index INTEGER NOT NULL,
            suggestion_type TEXT CHECK (suggestion_type IN ('grammar', 'spelling', 'style')) NOT NULL,
            original_text TEXT NOT NULL,
            suggested_text TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        RAISE NOTICE 'Created suggestions table';
    ELSE
        RAISE NOTICE 'Suggestions table already exists';
        
        -- Add constraint if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.check_constraints 
            WHERE constraint_schema = 'public' 
            AND table_name = 'suggestions' 
            AND constraint_name LIKE '%suggestion_type%'
        ) THEN
            ALTER TABLE suggestions ADD CONSTRAINT suggestions_suggestion_type_check 
            CHECK (suggestion_type IN ('grammar', 'spelling', 'style'));
            RAISE NOTICE 'Added suggestion_type constraint to suggestions table';
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =============================================================================

DO $$
BEGIN
    -- Enable RLS on users table
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = true
    ) THEN
        ALTER TABLE users ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on users table';
    ELSE
        RAISE NOTICE 'RLS already enabled on users table';
    END IF;

    -- Enable RLS on documents table
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'documents' AND rowsecurity = true
    ) THEN
        ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on documents table';
    ELSE
        RAISE NOTICE 'RLS already enabled on documents table';
    END IF;

    -- Enable RLS on document_versions table
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'document_versions' AND rowsecurity = true
    ) THEN
        ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on document_versions table';
    ELSE
        RAISE NOTICE 'RLS already enabled on document_versions table';
    END IF;

    -- Enable RLS on suggestions table
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'suggestions' AND rowsecurity = true
    ) THEN
        ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on suggestions table';
    ELSE
        RAISE NOTICE 'RLS already enabled on suggestions table';
    END IF;
END $$;

-- =============================================================================
-- STEP 3: CREATE RLS POLICIES
-- =============================================================================

DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Users policies
    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view own profile') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can view own profile" ON users;
    END IF;
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can update own profile') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can update own profile" ON users;
    END IF;
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can insert own profile') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can insert own profile" ON users;
    END IF;
    CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

    -- Documents policies
    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can view own documents') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can view own documents" ON documents;
    END IF;
    CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can create own documents') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can create own documents" ON documents;
    END IF;
    CREATE POLICY "Users can create own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can update own documents') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can update own documents" ON documents;
    END IF;
    CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Users can delete own documents') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can delete own documents" ON documents;
    END IF;
    CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

    -- Document versions policies
    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'Users can view own document versions') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can view own document versions" ON document_versions;
    END IF;
    CREATE POLICY "Users can view own document versions" ON document_versions FOR SELECT USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
    );

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'Users can create document versions') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can create document versions" ON document_versions;
    END IF;
    CREATE POLICY "Users can create document versions" ON document_versions FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
    );

    -- Suggestions policies
    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suggestions' AND policyname = 'Users can view own suggestions') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can view own suggestions" ON suggestions;
    END IF;
    CREATE POLICY "Users can view own suggestions" ON suggestions FOR SELECT USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
    );

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suggestions' AND policyname = 'Users can create suggestions') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can create suggestions" ON suggestions;
    END IF;
    CREATE POLICY "Users can create suggestions" ON suggestions FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
    );

    SELECT EXISTS (SELECT FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suggestions' AND policyname = 'Users can delete own suggestions') INTO policy_exists;
    IF policy_exists THEN
        DROP POLICY "Users can delete own suggestions" ON suggestions;
    END IF;
    CREATE POLICY "Users can delete own suggestions" ON suggestions FOR DELETE USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
    );

    RAISE NOTICE 'All RLS policies created/updated successfully';
END $$;

-- =============================================================================
-- STEP 4: CREATE USER PROFILE FUNCTION AND TRIGGER
-- =============================================================================

-- Check if function already exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_proc WHERE proname = 'handle_new_user') THEN
        DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
        RAISE NOTICE 'Dropped existing handle_new_user function';
    END IF;
END $$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user profile, handling conflicts gracefully
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name);
    
    RAISE NOTICE 'User profile created/updated for user: %', NEW.email;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating user profile for %: %', NEW.email, SQLERRM;
        RETURN NEW; -- Don't fail the auth process if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger already exists and drop it if it does
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE trigger_name = 'on_auth_user_created' 
        AND event_object_table = 'users'
        AND trigger_schema = 'auth'
    ) THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
        RAISE NOTICE 'Dropped existing trigger on_auth_user_created';
    END IF;
END $$;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
BEGIN
    RAISE NOTICE 'User profile function and trigger created successfully!';
END $$;

-- =============================================================================
-- STEP 5: CREATE PERFORMANCE INDEXES
-- =============================================================================

DO $$
BEGIN
    -- Documents indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_documents_user_id') THEN
        CREATE INDEX idx_documents_user_id ON documents(user_id);
        RAISE NOTICE 'Created index: idx_documents_user_id';
    ELSE
        RAISE NOTICE 'Index idx_documents_user_id already exists';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_documents_last_edited') THEN
        CREATE INDEX idx_documents_last_edited ON documents(last_edited_at DESC);
        RAISE NOTICE 'Created index: idx_documents_last_edited';
    ELSE
        RAISE NOTICE 'Index idx_documents_last_edited already exists';
    END IF;

    -- Document versions indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_document_versions_document_id') THEN
        CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
        RAISE NOTICE 'Created index: idx_document_versions_document_id';
    ELSE
        RAISE NOTICE 'Index idx_document_versions_document_id already exists';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_document_versions_created_at') THEN
        CREATE INDEX idx_document_versions_created_at ON document_versions(created_at DESC);
        RAISE NOTICE 'Created index: idx_document_versions_created_at';
    ELSE
        RAISE NOTICE 'Index idx_document_versions_created_at already exists';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_document_versions_content_hash') THEN
        CREATE INDEX idx_document_versions_content_hash ON document_versions(document_id, content_hash);
        RAISE NOTICE 'Created index: idx_document_versions_content_hash';
    ELSE
        RAISE NOTICE 'Index idx_document_versions_content_hash already exists';
    END IF;

    -- Suggestions indexes
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_suggestions_document_id') THEN
        CREATE INDEX idx_suggestions_document_id ON suggestions(document_id);
        RAISE NOTICE 'Created index: idx_suggestions_document_id';
    ELSE
        RAISE NOTICE 'Index idx_suggestions_document_id already exists';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_suggestions_start_index') THEN
        CREATE INDEX idx_suggestions_start_index ON suggestions(document_id, start_index);
        RAISE NOTICE 'Created index: idx_suggestions_start_index';
    ELSE
        RAISE NOTICE 'Index idx_suggestions_start_index already exists';
    END IF;

    RAISE NOTICE 'All indexes created/verified successfully!';
END $$;

-- =============================================================================
-- STEP 6: UPDATE EXISTING CONTENT HASHES
-- =============================================================================

DO $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Check if document_versions table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_versions') THEN
        RAISE NOTICE 'document_versions table does not exist, skipping content hash update';
        RETURN;
    END IF;

    -- Check if content_hash column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'document_versions' AND column_name = 'content_hash') THEN
        RAISE NOTICE 'content_hash column does not exist, skipping update';
        RETURN;
    END IF;

    -- Count rows that need updating
    SELECT COUNT(*) INTO updated_count
    FROM document_versions 
    WHERE content_hash IS NULL AND content_snapshot IS NOT NULL;

    IF updated_count = 0 THEN
        RAISE NOTICE 'No document versions need content hash updates';
        RETURN;
    END IF;

    RAISE NOTICE 'Updating content hashes for % document versions...', updated_count;

    -- Update existing versions with content hashes using a simple hash function
    UPDATE document_versions 
    SET content_hash = abs(
        -- Simple hash based on content length and character codes
        (length(content_snapshot) * 31) + 
        COALESCE(ascii(substring(content_snapshot, 1, 1)), 0) * 1000 +
        COALESCE(ascii(substring(content_snapshot, length(content_snapshot), 1)), 0) * 100 +
        COALESCE(ascii(substring(content_snapshot, GREATEST(1, length(content_snapshot)/2), 1)), 0) * 10
    )::text
    WHERE content_hash IS NULL AND content_snapshot IS NOT NULL;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Successfully updated content hashes for % document versions', updated_count;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating content hashes: %', SQLERRM;
END $$;

-- =============================================================================
-- STEP 7: FINAL VALIDATION
-- =============================================================================

-- Verify all tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('users', 'documents', 'document_versions', 'suggestions');
    
    RAISE NOTICE 'Found % out of 4 required tables', table_count;
    
    IF table_count = 4 THEN
        RAISE NOTICE '✅ All required tables exist';
    ELSE
        RAISE WARNING '❌ Missing tables detected';
    END IF;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'documents', 'document_versions', 'suggestions')
    AND rowsecurity = true;
    
    RAISE NOTICE 'Found % out of 4 tables with RLS enabled', rls_count;
    
    IF rls_count = 4 THEN
        RAISE NOTICE '✅ RLS enabled on all tables';
    ELSE
        RAISE WARNING '❌ RLS not enabled on all tables';
    END IF;
END $$;

-- Verify policies exist
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND tablename IN ('users', 'documents', 'document_versions', 'suggestions');
    
    RAISE NOTICE 'Found % RLS policies across all tables', policy_count;
    
    IF policy_count >= 10 THEN
        RAISE NOTICE '✅ Sufficient RLS policies exist';
    ELSE
        RAISE WARNING '❌ Insufficient RLS policies';
    END IF;
END $$;

-- Verify trigger exists
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND trigger_name = 'on_auth_user_created';
    
    IF trigger_count > 0 THEN
        RAISE NOTICE '✅ User profile trigger exists';
    ELSE
        RAISE WARNING '❌ User profile trigger missing';
    END IF;
END $$;

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== DATABASE SETUP COMPLETE ===';
    RAISE NOTICE 'All tables, functions, triggers, indexes, and policies have been created/updated.';
    RAISE NOTICE 'The database is ready for the Grammarly MVP application.';
    RAISE NOTICE '================================';
    RAISE NOTICE '';
END $$;
