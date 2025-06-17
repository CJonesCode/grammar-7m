-- Safe table creation with proper error handling
DO $$ 
BEGIN
    -- Enable UUID extension if not exists
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    RAISE NOTICE 'UUID extension enabled';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'UUID extension may already exist: %', SQLERRM;
END $$;

-- Drop existing policies first to avoid conflicts
DO $$ 
BEGIN
    -- Drop all existing policies
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
    RAISE NOTICE 'Dropped existing policies if they existed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some policies may not have existed: %', SQLERRM;
END $$;

-- Create users table if it doesn't exist
DO $$ 
BEGIN
    CREATE TABLE users (
        id UUID REFERENCES auth.users(id) PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created users table';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Users table already exists, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating users table: %', SQLERRM;
END $$;

-- Create documents table if it doesn't exist
DO $$ 
BEGIN
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
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Documents table already exists, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating documents table: %', SQLERRM;
END $$;

-- Create document_versions table if it doesn't exist
DO $$ 
BEGIN
    CREATE TABLE document_versions (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
        content_snapshot TEXT NOT NULL,
        readability_score JSONB DEFAULT '{}',
        content_hash TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    RAISE NOTICE 'Created document_versions table';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Document_versions table already exists, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating document_versions table: %', SQLERRM;
END $$;

-- Create suggestions table if it doesn't exist
DO $$ 
BEGIN
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
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Suggestions table already exists, skipping creation';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating suggestions table: %', SQLERRM;
END $$;

-- Add missing columns safely
DO $$ 
BEGIN
    -- Add content_hash to document_versions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_versions' 
        AND column_name = 'content_hash'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE document_versions ADD COLUMN content_hash TEXT;
        RAISE NOTICE 'Added content_hash column to document_versions';
    ELSE
        RAISE NOTICE 'content_hash column already exists in document_versions';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error adding content_hash column: %', SQLERRM;
END $$;

-- Enable Row Level Security safely
DO $$ 
BEGIN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on all tables';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'RLS may already be enabled: %', SQLERRM;
END $$;

-- Create RLS policies safely
DO $$ 
BEGIN
    -- Users policies
    CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
    
    -- Documents policies
    CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can create own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);
    
    -- Document versions policies
    CREATE POLICY "Users can view own document versions" ON document_versions FOR SELECT USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
    );
    CREATE POLICY "Users can create document versions" ON document_versions FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
    );
    
    -- Suggestions policies
    CREATE POLICY "Users can view own suggestions" ON suggestions FOR SELECT USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
    );
    CREATE POLICY "Users can create suggestions" ON suggestions FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
    );
    CREATE POLICY "Users can delete own suggestions" ON suggestions FOR DELETE USING (
        EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
    );
    
    RAISE NOTICE 'Created all RLS policies successfully';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Some policies already exist, this is expected';
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

DO $$ 
BEGIN
    RAISE NOTICE 'Table creation script completed successfully';
END $$;
