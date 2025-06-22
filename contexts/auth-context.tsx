"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { User } from "@supabase/supabase-js"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          storage: {
            getItem: (key) => {
              if (typeof window === "undefined") return null
              return window.localStorage.getItem(key)
            },
            setItem: (key, value) => {
              if (typeof window === "undefined") return
              window.localStorage.setItem(key, value)
            },
            removeItem: (key) => {
              if (typeof window === "undefined") return
              window.localStorage.removeItem(key)
            },
          },
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    )
  )

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log("🔄 Auth: Initializing authentication...")
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error("❌ Auth: Error getting session:", error)
        } else if (session?.user) {
          console.log("✅ Auth: Found existing session for:", session.user.email)
          setUser(session.user)
        } else {
          console.log("ℹ️ Auth: No existing session found")
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log(`🔄 Auth: Auth state changed - ${event}`, session?.user?.email)
            
            if (event === 'SIGNED_IN' && session?.user) {
              setUser(session.user)
            } else if (event === 'SIGNED_OUT') {
              setUser(null)
            } else if (event === 'TOKEN_REFRESHED' && session?.user) {
              console.log("🔄 Auth: Token refreshed for:", session.user.email)
              setUser(session.user)
            }
          }
        )

        setLoading(false)
        return () => subscription.unsubscribe()
      } catch (error) {
        console.error("❌ Auth: Error initializing auth:", error)
        setLoading(false)
      }
    }

    initializeAuth()
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const refreshSession = async () => {
    try {
      console.log("🔄 Auth: Refreshing session...")
      const { data: { session }, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("❌ Auth: Error refreshing session:", error)
        throw error
      }
      if (session?.user) {
        console.log("✅ Auth: Session refreshed for:", session.user.email)
        setUser(session.user)
      }
    } catch (error) {
      console.error("❌ Auth: Failed to refresh session:", error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
