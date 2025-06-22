"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { generateSuggestions, type GrammarSuggestion } from "@/lib/grammar"
import { getReadabilityLevel, type ReadabilityScore } from "@/lib/readability"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, BarChart3 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VersionHistoryDrawer } from "@/components/version-history-drawer"
import { AutosaveSpinner } from "@/components/autosave-spinner"

// Avoid NaN when the score hasn't been calculated yet
function safeRound(value: number | null | undefined) {
  return Number.isFinite(value as number) ? Math.round(value as number) : 0
}

interface Document {
  id: string
  title: string
  content: string
  readability_score: ReadabilityScore
  last_edited_at: string
}

const AUTOSAVE_DELAY = 2000 // 2 seconds

export default function EditorPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState("")
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [readabilityScore, setReadabilityScore] = useState<ReadabilityScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autosaveActive, setAutosaveActive] = useState(false)

  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/")
      return
    }

    if (user) {
      fetchDocument()
    }
  }, [user, authLoading, router, params.id])

  const fetchDocument = async () => {
    try {
      const response = await fetch(`/api/documents/${params.id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch document")
      }

      const { document: data } = await response.json()

      setDocument(data)
      setContent(data.content)
      setReadabilityScore(data.readability_score)

      // Generate initial suggestions
      if (data.content.trim()) {
        await generateSuggestionsForContent(data.content)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const generateSuggestionsForContent = async (text: string) => {
    if (!text.trim()) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(`/api/documents/${params.id}/suggestions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: text,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } else {
        // Fallback to client-side suggestions
        const mockSuggestions = generateSuggestions(text)
        setSuggestions(mockSuggestions)
      }
    } catch (error) {
      // Fallback to client-side suggestions
      const mockSuggestions = generateSuggestions(text)
      setSuggestions(mockSuggestions)
    }
  }

  const saveDocument = useCallback(
    async (newContent: string) => {
      if (!document) return

      setSaving(true)
      try {
        // Consolidated edit endpoint
        const response = await fetch(`/api/documents/${document.id}/edit`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: newContent,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to save document")
        }

        const { document: updatedDoc, suggestions: newSuggestions } = await response.json()
        setReadabilityScore(updatedDoc.readability_score)
        setSuggestions(newSuggestions)

        setLastSaved(new Date())
      } catch (error: any) {
        setError(error.message)
      } finally {
        setSaving(false)
      }
    },
    [document],
  )

  const handleContentChange = (newContent: string) => {
    setContent(newContent)

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Start autosave countdown
    setAutosaveActive(true)

    // Debounced save and suggestion generation
    saveTimeoutRef.current = setTimeout(() => {
      setAutosaveActive(false)
      saveDocument(newContent)
    }, AUTOSAVE_DELAY)
  }

  const handleAutosaveComplete = () => {
    setAutosaveActive(false)
  }

  const applySuggestion = (suggestion: GrammarSuggestion) => {
    const newContent =
      content.slice(0, suggestion.startIndex) + suggestion.suggestedText + content.slice(suggestion.endIndex)

    setContent(newContent)

    // Remove the applied suggestion immediately
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))

    // Save and regenerate suggestions
    handleContentChange(newContent)

    // Focus back to textarea
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  const dismissSuggestion = (suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
  }

  const handleRestoreVersion = (versionContent: string) => {
    setContent(versionContent)
    handleContentChange(versionContent)
  }

  const handleManualSave = () => {
    // Cancel autosave and save immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    setAutosaveActive(false)
    saveDocument(content)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Document not found</h2>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
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
            <div className="flex items-baseline space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900 truncate max-w-md">{document.title}</h1>

              {/* Status indicators */}
              <div className="flex items-baseline space-x-3">
                <AutosaveSpinner
                  isActive={autosaveActive}
                  duration={AUTOSAVE_DELAY}
                  onComplete={handleAutosaveComplete}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <VersionHistoryDrawer documentId={document.id} onRestoreVersion={handleRestoreVersion} />
              <Button variant="outline" size="sm" onClick={handleManualSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Now
              </Button>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)]">
              <CardContent className="p-0 h-full">
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing your thesis chapter..."
                  className="w-full h-full p-6 border-none resize-none focus:outline-none text-gray-900 leading-relaxed"
                  style={{ fontSize: "16px", lineHeight: "1.6" }}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Readability Score */}
            {readabilityScore && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Readability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>Reading Ease</span>
                      <span className="font-medium">{safeRound(readabilityScore.fleschReadingEase)}/100</span>
                    </div>
                    {Number.isFinite(readabilityScore.fleschReadingEase) && (
                      <div className="text-xs text-gray-700">
                        {getReadabilityLevel(readabilityScore.fleschReadingEase)}
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Words</span>
                      <span>{readabilityScore.wordCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sentences</span>
                      <span>{readabilityScore.sentenceCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Grade Level</span>
                      <span>{safeRound(readabilityScore.fleschKincaidGrade)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Suggestions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Suggestions ({suggestions.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.length === 0 ? (
                  <p className="text-sm text-gray-700">No suggestions found. Great job!</p>
                ) : (
                  suggestions.slice(0, 10).map((suggestion) => (
                    <div key={suggestion.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant={
                            suggestion.type === "grammar"
                              ? "destructive"
                              : suggestion.type === "spelling"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {suggestion.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{suggestion.message}</p>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-700">
                          Original: <span className="font-mono bg-red-50 px-1 rounded">{suggestion.originalText}</span>
                        </div>
                        <div className="text-xs text-gray-700">
                          Suggested:{" "}
                          <span className="font-mono bg-green-50 px-1 rounded">{suggestion.suggestedText}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" onClick={() => applySuggestion(suggestion)} className="text-xs">
                          Apply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dismissSuggestion(suggestion.id)}
                          className="text-xs"
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
