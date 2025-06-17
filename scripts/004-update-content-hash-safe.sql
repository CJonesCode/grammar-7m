-- Safe content hash update with error handling
DO $$ 
DECLARE
    updated_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    -- Check if we have any records to update
    SELECT COUNT(*) INTO total_count
    FROM document_versions 
    WHERE content_hash IS NULL AND content_snapshot IS NOT NULL;
    
    IF total_count > 0 THEN
        RAISE NOTICE 'Found % records to update with content hashes', total_count;
        
        -- Update with a simple hash function that should work on most PostgreSQL installations
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
        RAISE NOTICE 'Updated % records with content hashes', updated_count;
    ELSE
        RAISE NOTICE 'No records need content hash updates';
    END IF;
    
    RAISE NOTICE 'Content hash update script completed';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating content hashes: %', SQLERRM;
        RAISE NOTICE 'This is not critical - content hashes will be generated for new versions';
END $$;
