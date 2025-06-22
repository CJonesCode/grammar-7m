import { createBrowserClient } from "@supabase/ssr"

// This singleton client is meant **only** for Client Components.
// For any Server Component or Route Handler, use the helpers directly:
//   import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
//   import { cookies } from "next/headers"
//   const supabase = createServerComponentClient({ cookies })
// or const supabase = createRouteHandlerClient({ cookies })

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY!
)
