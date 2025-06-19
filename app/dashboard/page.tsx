"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
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
  content: string
  last_edited_at: string
  created_at: string
  readability_score: any
}

export default function DashboardPage() {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newDocTitle, setNewDocTitle] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetchDocuments()
    }
  }, [user, authLoading, router])

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase.from("documents").select("*").order("last_edited_at", { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async () => {
    if (!newDocTitle.trim()) return

    setIsCreating(true)
    try {
      const { data, error } = await supabase
        .from("documents")
        .insert({
          title: newDocTitle,
          content: "",
          user_id: user?.id,
        })
        .select()
        .single()

      if (error) throw error

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
      const { error } = await supabase.from("documents").delete().eq("id", docId)

      if (error) throw error

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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
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
              <h1 className="text-xl font-semibold text-gray-900">Grammar Checker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.email}</span>
              <Button variant="ghost" size="sm" onClick={() => router.push("/settings")}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={signOut}>
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
          {documents.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              <p className="text-gray-600 mb-4">Create your first document to get started with grammar checking.</p>
            </div>
          ) : (
            documents.map((doc) => (
              <Card key={doc.id} className="hover:shadow-md transition-shadow relative group">
                <div className="cursor-pointer" onClick={() => router.push(`/editor/${doc.id}`)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg truncate pr-8">{doc.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>Last edited: {formatDate(doc.last_edited_at)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4" />
                        <span>{getWordCount(doc.content)} words</span>
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
