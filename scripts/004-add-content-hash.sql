-- Add content_hash column to document_versions table
ALTER TABLE document_versions ADD COLUMN content_hash TEXT;

-- Create index for faster lookups
CREATE INDEX idx_document_versions_content_hash ON document_versions(document_id, content_hash);

-- Update existing versions with content hashes (this will be slow for large datasets)
UPDATE document_versions 
SET content_hash = abs(
  (
    SELECT sum(ascii(substr(content_snapshot, generate_series(1, length(content_snapshot)), 1)) * generate_series(1, length(content_snapshot)))
    FROM (SELECT content_snapshot) AS t
  )
)::text
WHERE content_hash IS NULL;
