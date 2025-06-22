# Grammarly MVP - Product Requirements Document (PRD)

## 📌 Project Overview
Build a grammar correction tool for graduate students writing thesis chapters. The MVP will provide real-time grammar/spell checks, basic style suggestions, readability analysis, and secure document editing with user authentication.

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
  - `readability_score` (float or JSON)  
  - `last_edited_at` (timestamp)  
  - `created_at` (timestamp)  

- `document_versions`:  
  - `id` (UUID, primary key)  
  - `document_id` (UUID, foreign key to documents.id)  
  - `content_snapshot` (text)  
  - `readability_score` (float or JSON)  
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
- The app now uses `@supabase/ssr` for both browser and server clients.
  - Client: `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)`
  - Server / Route handlers: `createServerClient` wrapped in `lib/supabase-server.ts`.
- Required env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser & server)
  - Optional fallbacks for server‐only code: `SUPABASE_URL`, `SUPABASE_ANON_KEY`.
- `DEBUG_LOGGING=true` (and/or `NEXT_PUBLIC_DEBUG_LOGGING=true`) enables timing logs for performance profiling.

### API Endpoints (updated)
- `GET /api/documents` – returns `{ id, title, readability_score, last_edited_at }[]` (content omitted for speed).
- `POST /api/documents/:id/suggestions` – bulk-persists suggestions via RPC `save_suggestions`.

### Database helpers (new)
- `public.save_suggestions(doc_id uuid, suggestions jsonb)` – clears & bulk-inserts suggestion rows in one round-trip, `SECURITY DEFINER`.
- Composite index `idx_documents_user_last_edited (user_id, last_edited_at DESC)` supports the dashboard query.

---

### Key Components

- `LoginPage`