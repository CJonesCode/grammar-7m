# Database Structure

_This file is an up-to-date, human-readable overview of the schema that is created by `scripts/setup-complete-simple.sql` and optimized by `scripts/performance-optimization.sql`.  It is meant for developers who would like a quick reference to all tables, their columns, constraints, indexes, and the relations between them._

---

## ER Diagram (high-level)

```
 users            documents                 document_versions        suggestions
  ───┬────         ───┬────────              ───┬──────────────       ───┬────────
     │ id ───────────┘   user_id (FK)           │ document_id (FK)      │ document_id (FK)
     └───────────────────────────────────────────┘                       └───────────────
```

---

## Tables

### 1. `users`
| Column      | Type | Constraints/Default              |
|-------------|------|----------------------------------|
| `id`        | UUID | **PK**, references `auth.users(id)` |
| `email`     | TEXT | UNIQUE, **NOT NULL**             |
| `full_name` | TEXT |                                  |
| `created_at`| TIMESTAMPTZ | `DEFAULT now()`           |

Policies (RLS enabled):
* **Select / Update / Insert** – only allowed when `auth.uid() = id`.

---

### 2. `documents`
| Column            | Type         | Constraints/Default                         |
|-------------------|--------------|---------------------------------------------|
| `id`              | UUID         | **PK**, `DEFAULT uuid_generate_v4()`        |
| `user_id`         | UUID         | **FK** → `users(id)`, **NOT NULL**, `ON DELETE CASCADE` |
| `title`           | TEXT         | **NOT NULL**, `DEFAULT 'Untitled Document'` |
| `content`         | TEXT         | `DEFAULT ''`                                |
| `readability_score`| JSONB       | `DEFAULT '{}'`                              |
| `last_edited_at`  | TIMESTAMPTZ  | `DEFAULT now()`                             |
| `created_at`      | TIMESTAMPTZ  | `DEFAULT now()`                             |

Indexes:
* `idx_documents_user_id` – (`user_id`)
* `idx_documents_last_edited` – (`last_edited_at` DESC)
* `idx_documents_user_last_edited` – (`user_id`, `last_edited_at` DESC) - **PERFORMANCE CRITICAL**
* `idx_documents_dashboard_covering` – (`user_id`, `last_edited_at` DESC) INCLUDE (`id`, `title`, `readability_score`) - **COVERING INDEX**
* `idx_documents_active` – (`user_id`, `last_edited_at` DESC) WHERE `content != '' OR title != 'Untitled Document'`
* `idx_documents_readability_gin` – USING GIN (`readability_score`) - **JSONB INDEX**
* `idx_documents_user_id_btree` – USING BTREE (`user_id`)
* `idx_documents_content_length` – (`user_id`, `length(content)`) WHERE `content IS NOT NULL`

Policies (RLS enabled):
* **Select / Insert / Update / Delete** – allowed when `auth.uid() = user_id`.

---

### 3. `document_versions`
| Column            | Type         | Constraints/Default                         |
|-------------------|--------------|---------------------------------------------|
| `id`              | UUID         | **PK**, `DEFAULT uuid_generate_v4()`        |
| `document_id`     | UUID         | **FK** → `documents(id)`, **NOT NULL**, `ON DELETE CASCADE` |
| `content_snapshot`| TEXT         | **NOT NULL**                                |
| `readability_score`| JSONB       | `DEFAULT '{}'`                              |
| `content_hash`    | TEXT         | **DEDUPLICATION KEY**                       |
| `created_at`      | TIMESTAMPTZ  | `DEFAULT now()`                             |

Indexes:
* `idx_document_versions_document_id` – (`document_id`)
* `idx_document_versions_created_at` – (`created_at` DESC)
* `idx_document_versions_content_hash` – (`document_id`, `content_hash`)
* `idx_document_versions_doc_created` – (`document_id`, `created_at` DESC) - **PERFORMANCE OPTIMIZED**

Policies (RLS enabled):
* **Select / Insert** – allowed if a row exists in `documents` where `documents.id = document_versions.document_id` and `documents.user_id = auth.uid()`.

---

### 4. `suggestions`
| Column          | Type  | Constraints/Default                                                        |
|-----------------|-------|----------------------------------------------------------------------------|
| `id`            | UUID  | **PK**, `DEFAULT uuid_generate_v4()`                                       |
| `document_id`   | UUID  | **FK** → `documents(id)`, **NOT NULL**, `ON DELETE CASCADE`                |
| `start_index`   | INT   | **NOT NULL**                                                               |
| `end_index`     | INT   | **NOT NULL**                                                               |
| `suggestion_type` | TEXT | **NOT NULL**, CHECK in (`'grammar'`, `'spelling'`, `'style'`)             |
| `original_text` | TEXT  | **NOT NULL**                                                               |
| `suggested_text`| TEXT  | **NOT NULL**                                                               |
| `message`       | TEXT  | **NOT NULL**                                                               |
| `created_at`    | TIMESTAMPTZ | `DEFAULT now()`                                                      |

Indexes:
* `idx_suggestions_document_id` – (`document_id`)
* `idx_suggestions_start_index` – (`document_id`, `start_index`)
* `idx_suggestions_document_type` – (`document_id`, `suggestion_type`, `start_index`) - **PERFORMANCE OPTIMIZED**

Policies (RLS enabled):
* **Select / Insert / Delete** – allowed if a row exists in `documents` where `documents.id = suggestions.document_id` and `documents.user_id = auth.uid()`.

---

## Functions & Triggers

### `public.handle_new_user()`
* Purpose: Automatically create (or update) a profile row in `public.users` whenever a new record is inserted into `auth.users`.
* Security: `SECURITY DEFINER` – runs with elevated privileges so that profile creation cannot fail the auth flow.

Trigger:
* `on_auth_user_created` – **AFTER INSERT** on `auth.users` → executes `public.handle_new_user()`

### `public.save_suggestions(doc_id uuid, suggestions jsonb)`
* Purpose: Delete existing suggestions for a document and bulk-insert the new set in a single call (uses `jsonb_array_elements`).
* Security: `SECURITY DEFINER` – respects RLS via FK.
* Performance: Single round-trip operation for bulk suggestion updates.

### `public.get_user_documents(user_uuid UUID, limit_count INTEGER DEFAULT 20)`
* Purpose: Optimized function for dashboard queries that returns documents with only necessary columns.
* Returns: `TABLE (id UUID, title TEXT, readability_score JSONB, last_edited_at TIMESTAMPTZ)`
* Security: `SECURITY DEFINER` – respects RLS via user_uuid parameter.
* Performance: Uses covering index for optimal query performance.
* Usage: Called by `/api/documents` endpoint for dashboard loading.

---

## Row Level Security (RLS)
All four application tables (`users`, `documents`, `document_versions`, and `suggestions`) have RLS **enabled** with policies described above.  These policies ensure that every user can access only the rows they own (directly or indirectly via `documents`).

---

## Performance Optimizations

### Critical Indexes (Performance Impact)
1. **`idx_documents_user_last_edited`** – Reduces dashboard load from 815ms to ~100ms
2. **`idx_documents_dashboard_covering`** – Includes all needed columns for dashboard queries
3. **`idx_documents_readability_gin`** – Fast JSONB queries on readability scores
4. **`idx_suggestions_document_type`** – Optimized suggestion lookups by type
5. **`idx_document_versions_doc_created`** – Fast version history retrieval

### Content Deduplication
- `content_hash` column in `document_versions` prevents duplicate version snapshots
- Hash is generated from document content to identify identical versions
- Reduces storage and improves query performance

### Function Optimizations
- `get_user_documents()` function provides optimized dashboard queries
- `save_suggestions()` function enables bulk operations
- Both functions use `SECURITY DEFINER` for performance while respecting RLS

### Statistics & Maintenance
- Tables are analyzed regularly to maintain query planner statistics
- Autovacuum is configured for optimal performance
- Index usage is monitored via `pg_stat_user_indexes`

---

## Extension
* `uuid-ossp` – provides `uuid_generate_v4()` used for primary keys.

---

## Performance Monitoring

### Key Metrics to Monitor
- Dashboard query time: Target < 200ms
- Document save time: Target < 500ms
- Suggestion generation time: Target < 600ms
- Index usage statistics via `pg_stat_user_indexes`
- Query performance via `pg_stat_statements`

### Verification Scripts
- `scripts/verify-optimizations.sql` – Checks if all optimizations are active
- Performance dashboard in the application UI
- Database query timing logs when `DEBUG_LOGGING=true`

### Maintenance Recommendations
- Monitor index usage and drop unused indexes
- Refresh table statistics after significant data changes
- Consider partitioning for very large datasets (>1M documents)
- Implement connection pooling for high concurrency 