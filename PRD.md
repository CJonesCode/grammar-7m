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

---

### API Endpoints

- `GET/POST /api/documents`  
- `GET/PUT/DELETE /api/documents/:id`  
- `GET/POST /api/documents/:id/suggestions`  
- `GET/POST /api/documents/:id/versions`  
- `GET/PUT /api/profile`  

---

### Key Components

- `LoginPage` with `LoginForm`  
- `DashboardPage` with `DocumentList`, `NewDocumentButton`  
- `EditorPage` with `TextEditor`, `SuggestionSidebar`, `ReadabilityPanel`, `VersionHistoryDrawer`  
- `SettingsPage` with `UserProfileForm`, `DeleteAccountButton`  

---

## 🚀 MVP Launch Requirements

1. Users must be able to sign up, log in, and manage their session.  
2. Users must be able to create, save, and edit documents with autosave.  
3. The editor must show real-time grammar, spelling, and style suggestions via OpenAI API.  
4. Readability score must be calculated and displayed for each document.  
5. Each document must save version snapshots and allow restores.  
6. UI must be responsive, minimal, and distraction-free using Tailwind CSS.  
7. All API routes must be protected with Supabase auth and RLS.  
8. The application must work securely across desktop and tablet browsers.

