-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table if it doesn't exist (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Document',
  content TEXT DEFAULT '',
  readability_score JSONB DEFAULT '{}',
  last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_versions table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  content_snapshot TEXT NOT NULL,
  readability_score JSONB DEFAULT '{}',
  content_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create suggestions table if it doesn't exist
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

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add content_hash to document_versions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'document_versions' 
        AND column_name = 'content_hash'
    ) THEN
        ALTER TABLE document_versions ADD COLUMN content_hash TEXT;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DO $$ 
BEGIN
    -- Users policies
    DROP POLICY IF EXISTS "Users can view own profile" ON users;
    DROP POLICY IF EXISTS "Users can update own profile" ON users;
    DROP POLICY IF EXISTS "Users can insert own profile" ON users;
    
    -- Documents policies
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    DROP POLICY IF EXISTS "Users can create own documents" ON documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON documents;
    DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
    
    -- Document versions policies
    DROP POLICY IF EXISTS "Users can view own document versions" ON document_versions;
    DROP POLICY IF EXISTS "Users can create document versions" ON document_versions;
    
    -- Suggestions policies
    DROP POLICY IF EXISTS "Users can view own suggestions" ON suggestions;
    DROP POLICY IF EXISTS "Users can create suggestions" ON suggestions;
    DROP POLICY IF EXISTS "Users can delete own suggestions" ON suggestions;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own document versions" ON document_versions FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
);
CREATE POLICY "Users can create document versions" ON document_versions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = document_versions.document_id AND documents.user_id = auth.uid())
);

CREATE POLICY "Users can view own suggestions" ON suggestions FOR SELECT USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
);
CREATE POLICY "Users can create suggestions" ON suggestions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
);
CREATE POLICY "Users can delete own suggestions" ON suggestions FOR DELETE USING (
  EXISTS (SELECT 1 FROM documents WHERE documents.id = suggestions.document_id AND documents.user_id = auth.uid())
);
