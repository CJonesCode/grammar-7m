-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
            ALTER TABLE users ADD COLUMN full_name TEXT;
            RAISE NOTICE 'Added full_name column to users table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
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
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'readability_score') THEN
            ALTER TABLE documents ADD COLUMN readability_score JSONB DEFAULT '{}';
            RAISE NOTICE 'Added readability_score column to documents table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'last_edited_at') THEN
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
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'content_hash') THEN
            ALTER TABLE document_versions ADD COLUMN content_hash TEXT;
            RAISE NOTICE 'Added content_hash column to document_versions table';
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'readability_score') THEN
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

-- Enable Row Level Security on all tables
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

-- Create RLS policies (drop and recreate to ensure they're current)
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

RAISE NOTICE 'Database schema setup completed successfully!';
