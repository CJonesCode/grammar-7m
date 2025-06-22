import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export function createServerSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set")
  }

  // `cookies()` returns a RequestCookies object in runtime, but its typings in Next 15 are now async (Promise<...>).
  // Cast to `any` so we can keep a synchronous API expected by `@supabase/ssr` without changing call-sites.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const cookieStore: any = cookies()

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options)
          } catch {
            /* noop — likely called from a context where mutating cookies is not allowed */
          }
        })
      },
    },
  })
} 