-- Validates that the production database matches the expected MVP schema.
-- Run in the Supabase SQL editor (or CI). Any missing object raises an
-- exception and the script aborts.
--
-- The checks cover:
--   • Tables and required columns
--   • Primary / foreign keys
--   • Critical indexes
--   • Required helper functions
--
-- NOTE: This is intentionally strict for CI environments.  If you add new
-- columns later update the assertions below.

-- Simplified validation script: runs in read-only fashion and does not create or drop objects.
-- Each DO block contains its own assertions; nothing persists after execution.

-- 1. Core tables & columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE EXCEPTION 'Table public.users missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id' AND data_type = 'uuid') THEN
    RAISE EXCEPTION 'users.id column missing or wrong type';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    RAISE EXCEPTION 'Table public.documents missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'user_id') THEN
    RAISE EXCEPTION 'documents.user_id column missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions') THEN
    RAISE EXCEPTION 'Table public.document_versions missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'suggestions') THEN
    RAISE EXCEPTION 'Table public.suggestions missing';
  END IF;
END;
$$;

-- 2. PK / FK constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey' AND contype = 'p') THEN
    RAISE EXCEPTION 'users primary key missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_user_id_fkey' AND contype = 'f') THEN
    RAISE EXCEPTION 'documents.user_id foreign key missing';
  END IF;
END;
$$;

-- 3. Required indexes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_user_last_edited') THEN
    RAISE EXCEPTION 'Index idx_documents_user_last_edited missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_document_versions_content_hash') THEN
    RAISE EXCEPTION 'Index idx_document_versions_content_hash missing';
  END IF;
END;
$$;

-- 4. Helper functions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE nspname = 'public' AND proname = 'handle_new_user') THEN
    RAISE EXCEPTION 'Function public.handle_new_user missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE nspname = 'public' AND proname = 'save_suggestions') THEN
    RAISE EXCEPTION 'Function public.save_suggestions missing';
  END IF;
END;
$$;

-- success indicator
SELECT '✅  Schema validated successfully (non-destructive)' AS status; 