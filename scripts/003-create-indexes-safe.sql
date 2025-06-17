-- Safe index creation with error handling
DO $$ 
BEGIN
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_last_edited ON documents(last_edited_at DESC);
    CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
    CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_document_versions_content_hash ON document_versions(document_id, content_hash);
    CREATE INDEX IF NOT EXISTS idx_suggestions_document_id ON suggestions(document_id);
    CREATE INDEX IF NOT EXISTS idx_suggestions_start_index ON suggestions(document_id, start_index);
    
    RAISE NOTICE 'Created all indexes successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;
