"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { checkTextWithHarper, type GrammarSuggestion } from "@/lib/harper-client"
import { getReadabilityLevel, type ReadabilityScore } from "@/lib/readability"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Save, BarChart3, Settings, LogOut } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VersionHistoryDrawer } from "@/components/version-history-drawer"
import { ResearchDrawer } from "@/components/research-drawer"
import { AutosaveSpinner } from "@/components/autosave-spinner"
import { toast } from "@/components/ui/use-toast"
import Image from "next/image"
import { useSaveController } from "@/hooks/use-save-controller"

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

// Component to render highlighted text
function HighlightedText({ 
  content, 
  suggestions, 
  onSuggestionClick 
}: { 
  content: string
  suggestions: GrammarSuggestion[]
  onSuggestionClick: (suggestion: GrammarSuggestion) => void
}) {
  if (!content) return null

  // Sort suggestions by start index to process them in order
  const sortedSuggestions = [...suggestions].sort((a, b) => a.startIndex - b.startIndex)
  
  const segments: Array<{ text: string; suggestion?: GrammarSuggestion }> = []
  let lastIndex = 0

  // Create segments with suggestions
  sortedSuggestions.forEach(suggestion => {
    // Add text before this suggestion
    if (suggestion.startIndex > lastIndex) {
      segments.push({
        text: content.slice(lastIndex, suggestion.startIndex)
      })
    }
    
    // Add the suggested text with highlighting
    segments.push({
      text: content.slice(suggestion.startIndex, suggestion.endIndex),
      suggestion
    })
    
    lastIndex = suggestion.endIndex
  })

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({
      text: content.slice(lastIndex)
    })
  }

  return (
    <div
      className="w-full h-full min-h-full p-6 text-gray-900 leading-relaxed whitespace-pre-wrap overflow-y-auto"
      style={{ fontSize: "16px", lineHeight: "1.6" }}
    >
      {segments.map((segment, index) => {
        if (segment.suggestion) {
          const bgColor = segment.suggestion.type === 'grammar' 
            ? 'bg-red-100 border-b-2 border-red-300' 
            : segment.suggestion.type === 'spelling'
            ? 'bg-yellow-100 border-b-2 border-yellow-300'
            : 'bg-blue-100 border-b-2 border-blue-300'
          
          return (
            <span
              key={index}
              className={`${bgColor} cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => onSuggestionClick(segment.suggestion!)}
              title={`${segment.suggestion!.type}: ${segment.suggestion!.message}`}
            >
              {segment.text}
            </span>
          )
        }
        return <span key={index}>{segment.text}</span>
      })}
    </div>
  )
}

const AUTOSAVE_DELAY = 2000 // 2 seconds
const SUGGESTION_DEBOUNCE = 1000 // 1 second delay before generating suggestions

export default function EditorPage({ params }: { params: { id: string } }) {
  const { user, signOut, loading: authLoading } = useAuth()
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState("")
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [readabilityScore, setReadabilityScore] = useState<ReadabilityScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const {
    autosaveActive,
    requestSave,
    manualSave,
    handleTitleBlur: saveControllerTitleBlur,
  } = useSaveController({
    documentId: params.id,
    initialContent: document?.content || "",
    initialTitle: document?.title || "",
    autosaveDelay: AUTOSAVE_DELAY,
    onSaveSuccess: (data: any) => {
      // Update local document and readability
      setDocument(prev => prev ? {
        ...prev,
        title: data.title,
        content: data.content,
        readability_score: data.readabilityScore,
        last_edited_at: new Date().toISOString(),
      } : null)
      setReadabilityScore(data.readabilityScore)
    },
  })
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [showHighlightedView, setShowHighlightedView] = useState(false)
  const [titleInput, setTitleInput] = useState("")

  const suggestionTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
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

  const fetchSuggestions = async () => {
    try {
      setSuggestionsLoading(true)
      const response = await fetch(`/api/documents/${params.id}/suggestions`)
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions")
      }
      const { suggestions: raw } = await response.json()
      // Normalize keys coming from the database (snake_case) to GrammarSuggestion shape
      const normalized: GrammarSuggestion[] = (raw || []).map((s: any, index: number) => ({
        id: s.id ?? `db-${index}`,
        startIndex: s.start_index ?? s.startIndex,
        endIndex: s.end_index ?? s.endIndex,
        type: (s.suggestion_type ?? s.type) as "grammar" | "spelling" | "style",
        originalText: s.original_text ?? s.originalText ?? "",
        suggestedText: s.suggested_text ?? s.suggestedText ?? "",
        message: s.message ?? "",
      }))
      setSuggestions(normalized)
    } catch (err) {
      console.error("❌ Editor: Failed to fetch suggestions:", err)
    } finally {
      setSuggestionsLoading(false)
    }
  }

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

      // Fetch any pre-existing suggestions for this document from the server
      fetchSuggestions()

    } catch (error: any) {
      console.error("❌ Editor: Fetch error:", error)
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
    
    setSuggestionsLoading(true)
    
    try {
      // Use client-side Harper for grammar checking
      const harperSuggestions = await checkTextWithHarper(text)
      setSuggestions(harperSuggestions)
      
      // Store suggestions in database via API
      if (harperSuggestions.length > 0) {
        const response = await fetch(`/api/documents/${params.id}/suggestions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: text,
            suggestions: harperSuggestions,
          }),
        })

        if (!response.ok) {
          console.error("❌ Failed to save suggestions to database")
        }
      }
    } catch (error) {
      console.error("❌ Error generating suggestions:", error)
      setSuggestions([])
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)

    // Clear suggestion debounce timer
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current)
    }

    // Request save through controller (internally debounced)
    requestSave(newContent, titleInput)

    // Debounced suggestions (separate from save to avoid blocking)
    suggestionTimeoutRef.current = setTimeout(() => {
      generateSuggestionsForContent(newContent)
    }, SUGGESTION_DEBOUNCE)
  }

  const handleAutosaveComplete = () => {
    // No-op: controller updates spinner state automatically
  }

  const applySuggestion = (suggestion: GrammarSuggestion) => {
    const newContent =
      content.slice(0, suggestion.startIndex) + suggestion.suggestedText + content.slice(suggestion.endIndex)

    setContent(newContent)

    // Remove the applied suggestion immediately
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))

    // Save the document right away to persist change WITHOUT regenerating suggestions immediately
    manualSave(newContent, titleInput)

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

  const handleSuggestionClick = (suggestion: GrammarSuggestion) => {
    // Apply the suggestion when clicked
    applySuggestion(suggestion)
  }

  // Cleanup suggestion timer on unmount
  useEffect(() => {
    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (document) {
      setTitleInput(document.title)
    }
  }, [document?.title])

  // Rename handler
  const handleTitleBlur = () => {
    if (!document) return
    saveControllerTitleBlur(content, titleInput)
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
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                <Image src="/ship_of_thesis_icon.png" alt="Ship of Thesis Icon" width={24} height={24} className="mr-2" />
                Ship of Thesis
              </h1>
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

      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <Card className="h-[calc(100vh-200px)] flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/dashboard")}
                      aria-label="Back to dashboard"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <input
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={handleTitleBlur}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          (e.target as HTMLInputElement).blur()
                        }
                      }}
                      className="text-sm font-semibold bg-transparent border-b border-transparent focus:border-gray-300 focus:outline-none truncate max-w-xs"
                    />
                    <AutosaveSpinner
                      isActive={autosaveActive}
                      duration={AUTOSAVE_DELAY}
                      onComplete={handleAutosaveComplete}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <VersionHistoryDrawer documentId={document.id} onRestoreVersion={handleRestoreVersion} />
                    <ResearchDrawer documentId={document.id} documentTitle={document.title} />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => manualSave(content, titleInput)}
                      disabled={autosaveActive}
                      className="whitespace-nowrap"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Save Now</span>
                    </Button>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-700">Edit</span>
                      <Switch
                        checked={showHighlightedView}
                        onCheckedChange={(value) => {
                          if (value && suggestions.length === 0) return
                          setShowHighlightedView(value)
                        }}
                        disabled={suggestions.length === 0 && !showHighlightedView}
                      />
                      <span className="text-xs text-gray-700">Review</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden flex flex-col">
                {showHighlightedView ? (
                  <HighlightedText
                    content={content}
                    suggestions={suggestions}
                    onSuggestionClick={handleSuggestionClick}
                  />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Start writing your thesis chapter..."
                    className="w-full flex-1 p-6 border-none resize-none focus:outline-none text-gray-900 leading-relaxed overflow-y-auto"
                    style={{ fontSize: "16px", lineHeight: "1.6" }}
                  />
                )}
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
                <CardTitle className="text-sm font-medium">
                  Suggestions ({suggestions.length})
                  {suggestionsLoading && (
                    <span className="ml-2 text-xs text-blue-600">Analyzing...</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-full overflow-y-auto">
                {/* Highlighting Legend */}
                {suggestions.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-xs font-medium text-gray-700 mb-2">Highlighting Legend:</h4>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                        <span>Grammar errors</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
                        <span>Spelling errors</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
                        <span>Style suggestions</span>
                      </div>
                    </div>
                  </div>
                )}

                {suggestionsLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-gray-500">Finding suggestions...</p>
                  </div>
                ) : suggestions.length > 0 ? (
                  <ul className="space-y-3">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.id} className="border rounded-lg p-3 space-y-2">
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
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <p className="text-sm text-gray-500">
                      Suggestions will appear here as you write.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
