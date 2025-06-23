-- Create indexes for better performance (only if they don't exist)
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
