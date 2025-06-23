-- Update existing document_versions with content hashes
-- Only update rows that don't have a content_hash yet
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
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'document_versions' AND column_name = 'content_hash') THEN
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
