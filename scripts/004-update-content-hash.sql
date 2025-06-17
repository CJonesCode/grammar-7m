-- Update existing document_versions with content hashes
-- This uses a simple hash function that should work on most PostgreSQL installations
UPDATE document_versions 
SET content_hash = abs(
  -- Simple hash based on content length and character codes
  (length(content_snapshot) * 31) + 
  COALESCE(ascii(substring(content_snapshot, 1, 1)), 0) * 1000 +
  COALESCE(ascii(substring(content_snapshot, length(content_snapshot), 1)), 0) * 100 +
  COALESCE(ascii(substring(content_snapshot, length(content_snapshot)/2, 1)), 0) * 10
)::text
WHERE content_hash IS NULL AND content_snapshot IS NOT NULL;
