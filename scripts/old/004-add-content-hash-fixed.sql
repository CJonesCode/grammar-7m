-- Add content_hash column to document_versions table
ALTER TABLE document_versions ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_versions_content_hash ON document_versions(document_id, content_hash);

-- Update existing versions with content hashes using a simpler hash function
UPDATE document_versions 
SET content_hash = abs(hashtext(content_snapshot))::text
WHERE content_hash IS NULL;

-- If hashtext doesn't exist, use a simpler approach
DO $$
BEGIN
    -- Check if hashtext function exists
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'hashtext') THEN
        -- Use a simple hash based on length and first/last characters
        UPDATE document_versions 
        SET content_hash = (
            length(content_snapshot) + 
            COALESCE(ascii(substring(content_snapshot, 1, 1)), 0) * 1000 +
            COALESCE(ascii(substring(content_snapshot, length(content_snapshot), 1)), 0) * 100
        )::text
        WHERE content_hash IS NULL;
    END IF;
END $$;
