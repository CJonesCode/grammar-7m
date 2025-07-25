import { createBrowserClient } from "@supabase/ssr"

// This singleton client is meant **only** for Client Components.
// For any Server Component or Route Handler, use the helpers directly:
//   import { createServerComponentClient, createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
//   import { cookies } from "next/headers"
//   const supabase = createServerComponentClient({ cookies })
// or const supabase = createRouteHandlerClient({ cookies })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in the environment")
}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    cookies: {
      getAll() {
        return document.cookie.split(';').map(cookie => {
          const [name, value] = cookie.trim().split('=')
          return { name, value }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = `${name}=${value}; path=/; max-age=${options?.maxAge || 31536000}`
        })
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
