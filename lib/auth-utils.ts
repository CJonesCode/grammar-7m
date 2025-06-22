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
  const raw = cookies().get("supabase-auth-token")?.value
  if (!raw) return null

  try {
    const parsed: SupabaseAuthCookie = JSON.parse(decodeURIComponent(raw))
    if (!parsed.access_token) return null

    const payload = jwtDecode<JwtPayload>(parsed.access_token)
    return payload.sub ?? null
  } catch (err) {
    console.error("Failed to decode supabase auth cookie:", err)
    return null
  }
} 