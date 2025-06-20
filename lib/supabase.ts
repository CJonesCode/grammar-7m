import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Single client instance for browser
let browserClient: ReturnType<typeof createClient> | null = null

// Single server client instance (for API routes)
let serverClient: ReturnType<typeof createClient> | null = null

// Single SSR client instance (for pages with cookies)
let ssrClient: any = null

// Create browser client with singleton pattern
function createBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  })

  return browserClient
}

// Create server client with singleton pattern
function createServerClient() {
  if (serverClient) {
    return serverClient
  }

  serverClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return serverClient
}

// Create SSR client with singleton pattern
async function createSSRClient(cookieStore: any) {
  if (ssrClient) {
    return ssrClient
  }

  const { createServerClient: createSSRServerClient } = await import("@supabase/ssr")

  ssrClient = createSSRServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })

  return ssrClient
}

// Export the main client
export const supabase = typeof window !== "undefined" ? createBrowserClient() : createServerClient()

// Server-side client factory for SSR with cookies
export async function createServerSupabaseClient(cookieStore?: any) {
  // For API routes, use the singleton server client
  if (!cookieStore) {
    return createServerClient()
  }

  // For SSR pages, use the singleton SSR client
  return await createSSRClient(cookieStore)
}

// Reset function for development hot reloading (server-side only)
if (typeof window === "undefined") {
  // Only check NODE_ENV on server side
  const isDevelopment = process.env.NODE_ENV === "development"

  if (isDevelopment) {
    // Reset singletons in development for hot reloading
    const resetClients = () => {
      browserClient = null
      serverClient = null
      ssrClient = null
    }

    // Store reset function globally for hot reloading
    // @ts-ignore
    global.__supabase_reset = resetClients
  }
}
