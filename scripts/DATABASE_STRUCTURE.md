# Database Structure

_This file is an up-to-date, human-readable overview of the schema that is created by `scripts/000-setup-complete-simple.sql`.  It is meant for developers who would like a quick reference to all tables, their columns, constraints, indexes, and the relations between them._

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
* `idx_documents_user_last_edited` – (`user_id`, `last_edited_at` DESC)

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
| `content_hash`    | TEXT         |                                             |
| `created_at`      | TIMESTAMPTZ  | `DEFAULT now()`                             |

Indexes:
* `idx_document_versions_document_id` – (`document_id`)
* `idx_document_versions_created_at` – (`created_at` DESC)
* `idx_document_versions_content_hash` – (`document_id`, `content_hash`)

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

---

## Row Level Security (RLS)
All four application tables (`users`, `documents`, `document_versions`, and `suggestions`) have RLS **enabled** with policies described above.  These policies ensure that every user can access only the rows they own (directly or indirectly via `documents`).

---

## Extension
* `uuid-ossp` – provides `uuid_generate_v4()` used for primary keys.

---

## Outstanding Performance Recommendations
For production-scale workloads you may want to create additional indexes and constraints (e.g. trigram search on `title`, GIN on `readability_score`, unique constraint on `(document_id, content_hash)`, and range-based indexes for `suggestions`).  See `scripts/000-setup-complete-simple.sql` comments and the performance review in the code review. 

### Indexes (additions)
* `idx_documents_user_last_edited` – (`user_id`, `last_edited_at` DESC) optimises the dashboard list query. 