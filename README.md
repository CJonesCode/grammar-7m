# Ship of Thesis
### Your AI-Powered Writing Assistant for Theses and Academic Papers

---

## 🚀 Project Overview
A **Next.js 15** application that delivers Google-Docs-like editing with instant grammar, spelling and style feedback.  Targeted at graduate students writing thesis chapters, the app combines a modern React UI with **Supabase** for authentication, data persistence and row-level security.  Autosave, versioning and readability analytics are built-in so writers can stay focused on their words, not their tooling.

---

## 🧱 Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Framework** | **Next.js 15** (App Router, RSC) | Typescript, server components, edge-ready |
| **UI / Styling** | Tailwind CSS • shadcn/ui (Radix Primitives) | Accessible component library, theming via `ThemeProvider` |
| **State / Auth** | `@supabase/ssr` + Supabase Auth | Cookie-based auth available in Client, Server, Route Handlers & Middleware |
| **Database** | Supabase (PostgreSQL 15) | Schema lives in `scripts/`, RLS enforced on every table |
| **Grammar Engine** | **Harper.js** | Offline, privacy-first grammar checker (Rust/WASM) |
| **Readability** | In-house Flesch/FK implementation | See `lib/readability.ts` |
| **Tooling** | pnpm • Typescript 5 • Tailwind-Merge • Sonner (Toast) | Fast DX |

---

## 📂 Repository Guide
- `app/` – Next.js routes (App Router)
- `components/` – Re-usable UI primitives & feature widgets
- `contexts/` – React context for auth
- `lib/` – Grammar engine, readability scoring, Supabase helpers
- `scripts/` – SQL migration & helper functions
