-- Simplified database setup script that avoids information_schema issues
-- This script is idempotent and can be run multiple times safely

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- STEP 1: CREATE TABLES (Simple approach - CREATE IF NOT EXISTS)
-- =============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    content TEXT DEFAULT '',
    readability_score JSONB DEFAULT '{}',
    last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_versions table
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    content_snapshot TEXT NOT NULL,
    readability_score JSONB DEFAULT '{}',
    content_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suggestions table
CREATE TABLE IF NOT EXISTS suggestions (
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

-- =============================================================================
-- STEP 2: ADD MISSING COLUMNS (Using ALTER TABLE with error handling)
-- =============================================================================

-- Add content_hash column to document_versions if it doesn't exist
DO $$
BEGIN
    ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS content_hash TEXT;
EXCEPTION
    WHEN duplicate_column THEN
        -- Column already exists, do nothing
        NULL;
END $$;

-- =============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: CREATE RLS POLICIES (Drop and recreate to ensure they're current)
-- =============================================================================

-- Users policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON users;
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own documents" ON documents;
CREATE POLICY "Users can create own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Document versions policies
DROP POLICY IF EXISTS "Users can view own document versions" ON document_versions;
CREATE POLICY "Users can view own document versions" ON document_versions FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create document versions" ON document_versions;
CREATE POLICY "Users can create document versions" ON document_versions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
);

-- Suggestions policies
DROP POLICY IF EXISTS "Users can view own suggestions" ON suggestions;
CREATE POLICY "Users can view own suggestions" ON suggestions FOR SELECT USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create suggestions" ON suggestions;
CREATE POLICY "Users can create suggestions" ON suggestions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own suggestions" ON suggestions;
CREATE POLICY "Users can delete own suggestions" ON suggestions FOR DELETE USING (
    EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
);

-- =============================================================================
-- STEP 5: CREATE USER PROFILE FUNCTION AND TRIGGER
-- =============================================================================

-- Drop existing function and trigger if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the auth process if profile creation fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- STEP 6: CREATE PERFORMANCE INDEXES
-- =============================================================================

-- Create indexes (will be ignored if they already exist)
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_last_edited ON documents(last_edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_content_hash ON document_versions(document_id, content_hash);
CREATE INDEX IF NOT EXISTS idx_suggestions_document_id ON suggestions(document_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_start_index ON suggestions(document_id, start_index);

-- =============================================================================
-- STEP 7: UPDATE EXISTING CONTENT HASHES
-- =============================================================================

-- Update existing versions with content hashes using a simple hash function
UPDATE document_versions 
SET content_hash = abs(
    (length(content_snapshot) * 31) + 
    COALESCE(ascii(substring(content_snapshot, 1, 1)), 0) * 1000 +
    COALESCE(ascii(substring(content_snapshot, length(content_snapshot), 1)), 0) * 100 +
    COALESCE(ascii(substring(content_snapshot, GREATEST(1, length(content_snapshot)/2), 1)), 0) * 10
)::text
WHERE content_hash IS NULL AND content_snapshot IS NOT NULL;

-- =============================================================================
-- FINAL MESSAGE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully!';
    RAISE NOTICE 'All tables, policies, indexes, and triggers have been created.';
END $$;
