import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

    if (authError) {
      console.error(`⚠️ Middleware: Auth error for ${request.nextUrl.pathname}:`, authError.message)
    }

    // Add user ID to headers for API routes
    if (user) {
      response.headers.set('x-supa-user', user.id)
    } else {
      // Redirect to login for protected routes
      const protectedRoutes = ['/dashboard', '/editor', '/settings']
      const isProtectedRoute = protectedRoutes.some(route => 
        request.nextUrl.pathname.startsWith(route)
      )
      
      if (isProtectedRoute) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
    }
    
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