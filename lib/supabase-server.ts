import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

export function createServerSupabase() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not set")
  }

  return createServerClient(supabaseUrl, supabaseKey, { cookies })
} 