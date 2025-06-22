import { type NextRequest } from "next/server"
import { middleware as supabaseMiddleware } from "@/utils/supabase/middleware"

export function middleware(request: NextRequest) {
  return supabaseMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - anything containing a dot (likely a file extension)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
} 