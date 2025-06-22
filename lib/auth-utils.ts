import { cookies } from "next/headers"
import jwtDecode from "jwt-decode"

interface SupabaseAuthCookie {
  access_token: string
  expires_at?: number
  refresh_token?: string
}

interface JwtPayload {
  sub: string // user id (UUID)
  exp?: number
  [key: string]: unknown
}

/**
 * Attempts to extract the Supabase user id (uuid) from the auth cookie without
 * making a network round-trip.  Returns `null` if the cookie isn't present or
 * can't be decoded.
 */
export function getUserIdFromCookie(): string | null {
  // Supabase cookies are of the form `sb-<project-ref>-auth-token`.
  // We don't know the ref at build time, so we scan the CookieJar for the
  // first key that ends with "-auth-token".

  const jar = cookies()
  const tokenCookie = jar.getAll().find((c: { name: string }) => c.name.endsWith("-auth-token"))?.name
  if (!tokenCookie) return null

  const rawEncoded = jar.get(tokenCookie)?.value
  if (!rawEncoded) return null

  // Cookie is URL-encoded; decode first
  const decoded = decodeURIComponent(rawEncoded)

  let jwt: string | null = null

  // 1) Newer supabase-js puts the JWT directly in the cookie value (may have an "s:" prefix added by
  //    cookie-signature).  Detect that quickly.
  if (decoded.startsWith("ey")) {
    jwt = decoded
  }

  // 2) Legacy helpers store a JSON string containing { access_token, refresh_token, ... }
  if (!jwt) {
    try {
      const parsed: SupabaseAuthCookie = JSON.parse(decoded.replace(/^s:/, ""))
      jwt = parsed.access_token ?? null
    } catch {
      /* swallow */
    }
  }

  if (!jwt) return null

  try {
    const payload = jwtDecode<JwtPayload>(jwt)
    return payload.sub ?? null
  } catch (err) {
    console.error("Failed to decode supabase auth cookie:", err)
    return null
  }
} 