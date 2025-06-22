"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Settings, LogOut } from "lucide-react"

export function AppHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">Ship of Thesis</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">{user?.full_name || user?.email}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/settings")}
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
} 