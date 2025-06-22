import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

// Simple in-memory cache for Supabase clients
const clientCache = new Map<string, any>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function createServerSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set")
  }

  // Handle async cookies in Next.js 15
  const cookieStore = await cookies()
  
  // Create a cache key based on the session
  const sessionCookie = cookieStore.get('sb-access-token')?.value || 'no-session'
  const cacheKey = `supabase-${sessionCookie}`
  
  // Check cache first
  const cached = clientCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.client
  }
  
  // Create new client
  const client = createServerClient(supabaseUrl, supabaseKey, {
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
  
  // Cache the client
  clientCache.set(cacheKey, {
    client,
    timestamp: Date.now()
  })
  
  // Clean up old cache entries
  const now = Date.now()
  for (const [key, value] of clientCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      clientCache.delete(key)
    }
  }
  
  return client
} 