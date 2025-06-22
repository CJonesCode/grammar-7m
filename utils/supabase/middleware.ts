import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // set for current response and forward in request for route handlers
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options })
          response.cookies.set({ name, value: "", ...options })
        },
      },
    }
  )

  // Refresh session if needed and attach user id header for faster auth in handlers
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    response.headers.set("x-supa-user", user.id)
  }

  return response
} 