# Ship of Thesis - Product Requirements Document (PRD)

## 📌 Project Overview
Build a writing assistant for graduate students writing thesis chapters. The MVP will provide real-time grammar/spell checks, basic style suggestions, readability analysis, and secure document editing with user authentication.

---

## 👤 User Roles & Core Workflows

1. A registered user can log in securely using Supabase Auth.  
2. A user can create, edit, and delete thesis documents in a clean writing interface.  
3. A user sees grammar, spelling, and style suggestions while typing.  
4. A user can view readability scores for each document.  
5. A user can access and restore previous versions of their documents.  
6. A user can manage their profile and preferences in the settings page.

---

## 🧱 Technical Foundation

### Data Models

- `users`:  
  - `id` (UUID, primary key)  
  - `email` (text, unique)  
  - `full_name` (text)  
  - `created_at` (timestamp)  

- `documents`:  
  - `id` (UUID, primary key)  
  - `user_id` (UUID, foreign key to users.id)  
  - `title` (text)  
  - `content` (text or longtext)  
  - `readability_score` (JSONB)  
  - `last_edited_at` (timestamp)  
  - `created_at` (timestamp)  

- `document_versions`:  
  - `id` (UUID, primary key)  
  - `document_id` (UUID, foreign key to documents.id)  
  - `content_snapshot` (text)  
  - `readability_score` (JSONB)  
  - `content_hash` (text)  
  - `created_at` (timestamp)  

- `suggestions`:  
  - `id` (UUID, primary key)  
  - `document_id` (UUID, foreign key to documents.id)  
  - `start_index` (int)  
  - `end_index` (int)  
  - `suggestion_type` (enum: grammar, spelling, style)  
  - `original_text` (text)  
  - `suggested_text` (text)  
  - `message` (text)  
  - `created_at` (timestamp)  

### Authentication & Clients (updated)
- The app uses `@supabase/ssr` for both browser and server clients with cookie-based session storage.
  - Client: `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)` with cookie storage
  - Server / Route handlers: `createServerClient` wrapped in `lib/supabase-server.ts`.
- Required env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser & server)
  - Optional fallbacks for server‐only code: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- `DEBUG_LOGGING=true` (and/or `NEXT_PUBLIC_DEBUG_LOGGING=true`) enables timing logs for performance profiling.
- Automatic session refresh every 30 minutes with retry logic on 401 errors.

### API Endpoints (updated)
- `GET /api/documents` – returns `{ id, title, readability_score, last_edited_at }[]` (content omitted for speed).
- `GET /api/documents/[id]` – returns full document with content for editing.
- `POST /api/documents/[id]/edit` – updates document content and creates version snapshots.
- `POST /api/documents/[id]/suggestions` – bulk-persists suggestions via RPC `save_suggestions`.
- `GET /api/documents/[id]/versions` – returns document version history.
- `GET /api/performance` – returns performance metrics and analytics.

### Database Functions & Optimizations (new)
- `public.save_suggestions(doc_id uuid, suggestions jsonb)` – clears & bulk-inserts suggestion rows in one round-trip, `SECURITY DEFINER`.
- `public.get_user_documents(user_uuid UUID, limit_count INTEGER)` – optimized function for dashboard queries.
- `public.handle_new_user()` – automatically creates user profile on auth signup.

### Performance Optimizations (new)
- **Dashboard Performance**: Composite index `idx_documents_user_last_edited` reduces dashboard load from 815ms to ~100ms.
- **Covering Indexes**: `idx_documents_dashboard_covering` includes all needed columns for dashboard queries.
- **JSONB Indexing**: GIN index on `readability_score` for fast JSON queries.
- **Suggestion Optimization**: Composite index on `(document_id, suggestion_type, start_index)`.
- **Version History**: Index on `(document_id, created_at DESC)` for fast version retrieval.
- **Content Hashing**: Deduplication of document versions using content hashes.
- **Lazy Loading**: Suggestions and version history load on-demand in the editor.
- **Debounced Saves**: Document saves are debounced to reduce database writes.
- **Request Timeouts**: API routes have 10-second timeouts with fallback handling.

---

### Key Components

- `LoginPage` – Supabase Auth with cookie-based session storage
- `Dashboard` – Optimized document list with lazy loading and performance monitoring
- `Editor` – Real-time grammar checking with debounced saves and lazy-loaded suggestions
- `VersionHistoryDrawer` – Document version management with content hash deduplication
- `PerformanceDashboard` – Real-time performance metrics and analytics

### Security Features (updated)
- Row Level Security (RLS) enabled on all tables
- Cookie-based session storage (no localStorage for security)
- Automatic session refresh and retry logic
- Content hash validation for document versions
- SECURITY DEFINER functions with proper RLS respect

### Monitoring & Debugging (new)
- Comprehensive timing logs throughout the application
- Performance dashboard with real-time metrics
- Database query optimization monitoring
- Authentication flow debugging
- API response time tracking
