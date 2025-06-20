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
  const initialized = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    // Prevent double initialization
    if (initialized.current) {
      return
    }
    initialized.current = true

    let authSubscription: any = null

    // Get initial session
    const getInitialSession = async () => {
      try {
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
      } catch (error) {
        console.error("Error in getInitialSession:", error)
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }

    // Set up auth state listener
    const setupAuthListener = () => {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted.current) return

        // Skip logging INITIAL_SESSION to reduce noise
        if (event !== "INITIAL_SESSION") {
          console.log("Auth state changed:", event)
        }

        setUser(session?.user ?? null)
        if (session?.user && event === "SIGNED_IN") {
          await ensureUserProfile(session.user)
        }

        // Only set loading to false after initial session
        if (event === "INITIAL_SESSION") {
          setLoading(false)
        }
      })

      authSubscription = subscription
    }

    // Initialize auth
    const initializeAuth = async () => {
      setupAuthListener()
      await getInitialSession()
    }

    initializeAuth()

    return () => {
      mounted.current = false
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, []) // Empty dependency array to run only once

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
