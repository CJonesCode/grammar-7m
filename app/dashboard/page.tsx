"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PlusCircle, FileText, Calendar, MoreHorizontal } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Document {
  id: string
  title: string
  content: string
  readability_score: any
  last_edited_at: string
  created_at: string
}

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [error, setError] = useState("")

  const supabase = createClient()

  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user])

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      } else {
        setError("Failed to load documents")
      }
    } catch (error) {
      setError("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocTitle.trim()) return

    setCreating(true)
    setError("")

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newDocTitle.trim(),
          content: "",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments([data.document, ...documents])
        setNewDocTitle("")
        setShowCreateForm(false)
        router.push(`/editor/${data.document.id}`)
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to create document")
      }
    } catch (error) {
      setError("Failed to create document")
    } finally {
      setCreating(false)
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

  const getReadabilityDisplay = (score: any) => {
    if (!score || typeof score !== "object") return "Not analyzed"
    return `${score.readabilityLevel || "Unknown"} (${score.fleschReadingEase || 0})`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading your documents...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Grammar Assistant</h1>
              <p className="text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => router.push("/settings")}>
                Settings
              </Button>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Document Section */}
        <div className="mb-8">
          {!showCreateForm ? (
            <Card className="border-dashed border-2 border-gray-300 hover:border-gray-400 transition-colors">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PlusCircle className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Create your first document</h3>
                <p className="text-gray-600 text-center mb-4">
                  Start writing and get real-time grammar suggestions to improve your academic writing.
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  New Document
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create New Document</CardTitle>
                <CardDescription>Give your document a title to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={createDocument} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Document Title</Label>
                    <Input
                      id="title"
                      type="text"
                      value={newDocTitle}
                      onChange={(e) => setNewDocTitle(e.target.value)}
                      placeholder="e.g., Chapter 1: Introduction"
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex space-x-2">
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating..." : "Create Document"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Documents List */}
        {documents.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Documents</h2>
              <Button onClick={() => setShowCreateForm(true)} size="sm">
                <PlusCircle className="h-4 w-4 mr-2" />
                New Document
              </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => (
                <Card
                  key={doc.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/editor/${doc.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <FileText className="h-8 w-8 text-blue-600 mb-2" />
                      <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-lg line-clamp-2">{doc.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(doc.last_edited_at)}
                      </div>
                      <div>
                        <span className="font-medium">Readability:</span> {getReadabilityDisplay(doc.readability_score)}
                      </div>
                      <div>
                        <span className="font-medium">Words:</span>{" "}
                        {doc.content ? doc.content.split(/\s+/).filter((w) => w.length > 0).length : 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {documents.length === 0 && !showCreateForm && (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-600 mb-6">Create your first document to start improving your writing.</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}
