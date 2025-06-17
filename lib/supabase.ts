import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (singleton pattern)
let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null

export const supabase = (() => {
  if (typeof window === "undefined") {
    // Server-side: create new instance each time
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  // Client-side: use singleton
  if (!supabaseInstance) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseInstance
})()

// Export default for compatibility
export default supabase
