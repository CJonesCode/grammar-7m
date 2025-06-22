"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import LoginForm from "@/components/login-form"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/dashboard")
      } else {
        setShowLogin(true)
      }
    }
  }, [user, loading, router])

  // Show login form immediately when not authenticated
  if (showLogin) {
    return <LoginForm />
  }

  // Show minimal loading only during initial auth check
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-lg">Loading...</div>
    </div>
  )
}
