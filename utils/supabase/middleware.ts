import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export async function updateSession(request: NextRequest) {
  console.log("Middleware: Processing request for", request.url)
  const response = NextResponse.next({ request: { headers: request.headers } })

  try {
    // Debug: Log available cookies
    const allCookies = request.cookies.getAll()
    console.log("Middleware: Available cookies:", allCookies.map(c => c.name))
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // `RequestCookies` uses object overload
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              request.cookies.set({ name, value, ...options })
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    // Refresh session if needed and attach user id header for faster auth in handlers
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error) {
      console.error("Middleware auth error:", error)
      // Don't fail the request, just continue without user header
      return response
    }

    if (user) {
      console.log("Middleware: Setting user header for", user.email)
      response.headers.set("x-supa-user", user.id)
    } else {
      console.log("Middleware: No user found in session")
    }

    return response
  } catch (error) {
    console.error("Middleware error:", error)
    // Don't fail the request, just continue without user header
    return response
  }
} 