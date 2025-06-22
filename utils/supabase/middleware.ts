import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const startTime = performance.now()
  console.log(`🔄 Middleware: Processing ${request.method} ${request.nextUrl.pathname}`)

  try {
    // Create a response object that we can modify
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            try {
              return request.cookies.getAll()
            } catch (error) {
              console.error('❌ Middleware: Error getting cookies:', error)
              return []
            }
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                request.cookies.set(name, value)
                response.cookies.set(name, value, options)
              })
            } catch (error) {
              console.error('❌ Middleware: Error setting cookies:', error)
            }
          },
        },
      }
    )

    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const authTime = performance.now()
    console.log(`⏱️ Middleware: Auth check completed in ${authTime - startTime}ms`)

    if (authError) {
      console.log(`⚠️ Middleware: Auth error for ${request.nextUrl.pathname}:`, authError.message)
    }

    // Add user ID to headers for API routes
    if (user) {
      console.log(`✅ Middleware: User authenticated: ${user.email} (${user.id})`)
      response.headers.set('x-supa-user', user.id)
    } else {
      console.log(`❌ Middleware: No user found for ${request.nextUrl.pathname}`)
      
      // Redirect to login for protected routes
      const protectedRoutes = ['/dashboard', '/editor', '/settings']
      const isProtectedRoute = protectedRoutes.some(route => 
        request.nextUrl.pathname.startsWith(route)
      )
      
      if (isProtectedRoute) {
        console.log(`🔄 Middleware: Redirecting to login from ${request.nextUrl.pathname}`)
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }

    const totalTime = performance.now()
    console.log(`✅ Middleware: Total processing time ${totalTime - startTime}ms`)
    
    return response
  } catch (error) {
    console.error(`❌ Middleware: Error processing ${request.nextUrl.pathname}:`, error)
    
    // For API routes, return 401 instead of redirecting
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // For other routes, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }
} 