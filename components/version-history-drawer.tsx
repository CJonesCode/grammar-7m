"use client"

import { useState, useEffect } from "react"
// Remove direct supabase import
// import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { History, RotateCcw, Calendar, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DocumentVersion {
  id: string
  content_snapshot: string
  readability_score: any
  created_at: string
}

interface VersionHistoryDrawerProps {
  documentId: string
  onRestoreVersion: (content: string) => void
}

export function VersionHistoryDrawer({ documentId, onRestoreVersion }: VersionHistoryDrawerProps) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedVersion, setSelectedVersion] = useState<DocumentVersion | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const fetchVersions = async () => {
    setLoading(true)
    setError("")
    try {
      // Use fetch API instead of direct supabase client
      const response = await fetch(`/api/documents/${documentId}/versions`)

      if (!response.ok) {
        throw new Error("Failed to fetch versions")
      }

      const { versions: data } = await response.json()
      
      setVersions(data || [])
    } catch (error: any) {
      console.error("❌ VersionHistory: Fetch error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchVersions()
    }
  }, [isOpen, documentId])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }
  }

  const getWordCount = (content: string) => {
    return content.trim() ? content.trim().split(/\s+/).length : 0
  }

  const handleRestore = (version: DocumentVersion) => {
    onRestoreVersion(version.content_snapshot)
    setIsOpen(false)
  }

  const getVersionPreview = (content: string, maxLength = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + "..." : content
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            <History className="h-5 w-5 mr-2" />
            Version History
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="text-sm text-gray-600">Loading versions...</div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No versions yet</h3>
              <p className="text-gray-600">Versions are automatically saved as you edit your document.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => {
                const { date, time } = formatDate(version.created_at)
                const wordCount = getWordCount(version.content_snapshot)
                const isSelected = selectedVersion?.id === version.id

                return (
                  <Card
                    key={version.id}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedVersion(isSelected ? null : version)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {index === 0 ? "Latest" : `Version ${versions.length - index}`}
                          </Badge>
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-3 w-3 mr-1" />
                            {date} at {time}
                          </div>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText className="h-3 w-3 mr-1" />
                          {wordCount} words
                        </div>
                      </div>
                    </CardHeader>
                    {isSelected && (
                      <CardContent className="pt-0">
                        <div className="space-y-3">
                          <Separator />
                          <div>
                            <h4 className="text-sm font-medium mb-2">Preview:</h4>
                            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border">
                              {getVersionPreview(version.content_snapshot, 200) || "Empty document"}
                            </p>
                          </div>
                          {version.readability_score?.fleschReadingEase && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Readability:</h4>
                              <div className="text-sm text-gray-600">
                                Reading Ease: {Math.round(version.readability_score.fleschReadingEase)}/100
                              </div>
                            </div>
                          )}
                          <div className="flex space-x-2 pt-2">
                            <Button size="sm" onClick={() => handleRestore(version)}>
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore This Version
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
