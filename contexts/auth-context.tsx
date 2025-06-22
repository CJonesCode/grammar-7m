"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useRef } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const mounted = useRef(true)

  useEffect(() => {
    let authSubscription: any = null
    let timeoutId: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
        // Set up auth state listener
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted.current) return

          setUser(session?.user ?? null)
          
          if (session?.user && event === "SIGNED_IN") {
            await ensureUserProfile(session.user)
          }

          // Set loading to false for any auth state change
          setLoading(false)
          
          // Clear timeout if it exists
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
        })

        authSubscription = subscription

        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (!mounted.current) return

        if (error) {
          console.error("Error getting session:", error)
        } else {
          setUser(session?.user ?? null)
          if (session?.user) {
            await ensureUserProfile(session.user)
          }
        }

        // Always set loading to false after initial session check
        setLoading(false)
        
        // Clear timeout if it exists
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      } catch (error) {
        console.error("Error in initializeAuth:", error)
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Fallback timeout to prevent infinite loading
    timeoutId = setTimeout(() => {
      if (mounted.current) {
        console.warn("Auth initialization timeout - forcing loading to false")
        setLoading(false)
      }
    }, 5000) // 5 second timeout

    return () => {
      mounted.current = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [])

  const ensureUserProfile = async (user: User) => {
    try {
      // Check if user profile exists
      const { data: existingUser } = await supabase.from("users").select("id").eq("id", user.id).single()

      // If no profile exists, create one
      if (!existingUser) {
        await supabase.from("users").insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || "",
        })
      }
    } catch (error) {
      console.error("Error ensuring user profile:", error)
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
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

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
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
