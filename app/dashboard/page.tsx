"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, FileText, Calendar, LogOut, Settings, Trash2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Utility to avoid NaN in the UI
function safeRound(value: number | null | undefined) {
  return Number.isFinite(value as number) ? Math.round(value as number) : 0
}

interface Document {
  id: string
  title: string
  content?: string
  last_edited_at: string
  created_at: string
  readability_score: any
  word_count?: number
}

export default function DashboardPage() {
  const { user, signOut, loading: authLoading, refreshSession } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newDocTitle, setNewDocTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
      return
    }

    if (user) {
      fetchDocuments()
      
      // Set up periodic session refresh every 30 minutes
      const refreshInterval = setInterval(async () => {
        try {
          await refreshSession()
        } catch (error) {
          console.error("❌ Dashboard: Periodic refresh failed:", error)
        }
      }, 30 * 60 * 1000) // 30 minutes
      
      return () => clearInterval(refreshInterval)
    }
  }, [user, authLoading, router, refreshSession])

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/documents", {
        method: "GET",
        headers: {
          'Cache-Control': 'max-age=60', // Cache for 1 minute
        },
        // Reduced timeout to prevent hanging requests
        signal: AbortSignal.timeout(5000), // 5 second timeout (reduced from 10)
      })

      if (!response.ok) {
        if (response.status === 401) {
          try {
            await refreshSession()
            // Retry the fetch after session refresh
            const retryResponse = await fetch("/api/documents", {
              method: "GET",
              headers: {
                'Cache-Control': 'max-age=60',
              },
              signal: AbortSignal.timeout(5000),
            })
            
            if (!retryResponse.ok) {
              window.location.href = '/login'
              return
            }
            
            const { documents } = await retryResponse.json()
            setDocuments(documents || [])
            return
          } catch (refreshError) {
            console.error("❌ Dashboard: Failed to refresh session:", refreshError)
            window.location.href = '/login'
            return
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const { documents } = await response.json()
      
      setDocuments(documents || [])
    } catch (error: any) {
      console.error("❌ Dashboard: Fetch error:", error)
      setError(error.message)
      
      // Retry once after 2 seconds for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setTimeout(() => {
          fetchDocuments()
        }, 2000)
      }
    } finally {
      setLoading(false)
    }
  }, [refreshSession])

  const createDocument = async () => {
    if (!newDocTitle.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDocTitle,
          content: "",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create document")
      }

      const { document: data } = await response.json()

      setDocuments([data, ...documents])
      setNewDocTitle("")
      setDialogOpen(false)
      router.push(`/editor/${data.id}`)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsCreating(false)
    }
  }

  const deleteDocument = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${docTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      setDocuments(documents.filter((doc) => doc.id !== docId))
    } catch (error: any) {
      setError(error.message)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getWordCount = (content: string) => {
    return content.trim() ? content.trim().split(/\s+/).length : 0
  }

  // Memoize sorted documents to prevent unnecessary re-renders
  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => 
      new Date(b.last_edited_at).getTime() - new Date(a.last_edited_at).getTime()
    )
  }, [documents])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">Ship of Thesis</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading skeleton */}
          <div className="mb-8">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-3/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Ship of Thesis</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Welcome, {user?.email}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/settings")}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Create Document Section */}
        <div className="mb-8">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Document</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Document</DialogTitle>
                <DialogDescription>Enter a title for your new document. You can change this later.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Document Title</Label>
                  <Input
                    id="title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="Enter document title..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        createDocument()
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createDocument} disabled={isCreating || !newDocTitle.trim()}>
                    {isCreating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Documents Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedDocuments.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first document.
              </p>
            </div>
          ) : (
            sortedDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow relative group">
                <div className="cursor-pointer" onClick={() => router.push(`/editor/${doc.id}`)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg truncate pr-8">{doc.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Last edited: {formatDate(doc.last_edited_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>
                          {doc.readability_score?.wordCount || doc.word_count || 0} words
                        </span>
                      </div>
                      {Number.isFinite(doc.readability_score?.fleschReadingEase) && (
                        <div className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          Readability: {safeRound(doc.readability_score?.fleschReadingEase)}/100
                        </div>
                      )}
                    </div>
                  </CardContent>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteDocument(doc.id, doc.title)
                  }}
                  aria-label={`Delete document ${doc.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
