import { type NextRequest, NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"

export async function updateSession(request: NextRequest) {
  const startTime = performance.now()
  console.log("🔄 Middleware: Processing request for", request.url)
  const response = NextResponse.next({ request: { headers: request.headers } })

  try {
    // Debug: Log available cookies
    const allCookies = request.cookies.getAll()
    console.log("🍪 Middleware: Available cookies:", allCookies.map(c => c.name))
    
    const clientStartTime = performance.now()
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
    const clientEndTime = performance.now()
    console.log(`⏱️ Middleware: Supabase client created in ${clientEndTime - clientStartTime}ms`)

    // Refresh session if needed and attach user id header for faster auth in handlers
    const authStartTime = performance.now()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    const authEndTime = performance.now()
    console.log(`⏱️ Middleware: Auth check completed in ${authEndTime - authStartTime}ms`)

    if (error) {
      console.error("❌ Middleware: Auth error:", error)
      // Don't fail the request, just continue without user header
      return response
    }

    if (user) {
      console.log("✅ Middleware: Setting user header for", user.email)
      response.headers.set("x-supa-user", user.id)
    } else {
      console.log("ℹ️ Middleware: No user found in session")
    }

    const totalTime = performance.now()
    console.log(`✅ Middleware: Total processing time ${totalTime - startTime}ms`)
    return response
  } catch (error) {
    console.error("❌ Middleware: Unexpected error:", error)
    // Don't fail the request, just continue without user header
    return response
  }
} 