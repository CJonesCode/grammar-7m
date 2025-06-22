import { useCallback, useState } from "react"
import { ReadabilityScore } from "@/lib/readability"
import { GrammarSuggestion, generateSuggestions } from "@/lib/grammar"
import { api, type Document } from "@/lib/api-client"

const SUGGESTION_DEBOUNCE = 1000 // 1 second delay before generating suggestions

export function useDocument(documentId: string) {
  const [document, setDocument] = useState<Document | null>(null)
  const [content, setContent] = useState("")
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [readabilityScore, setReadabilityScore] = useState<ReadabilityScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  const fetchDocument = useCallback(async () => {
    try {
      const { document: data } = await api.getDocument(documentId)
      setDocument(data)
      setContent(data.content)
      setReadabilityScore(data.readability_score)
    } catch (error: any) {
      console.error("❌ Editor: Fetch error:", error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }, [documentId])

  const generateSuggestionsForContent = useCallback(async (text: string) => {
    if (!text.trim()) {
      setSuggestions([])
      return
    }
    
    setSuggestionsLoading(true)
    
    try {
      const { suggestions: data } = await api.getSuggestions(documentId, text)
      setSuggestions(data || [])
    } catch (error) {
      // Fallback to client-side suggestions if API fails
      const mockSuggestions = generateSuggestions(text)
      setSuggestions(mockSuggestions)
    } finally {
      setSuggestionsLoading(false)
    }
  }, [documentId])

  const saveDocument = useCallback(async (newContent: string, title: string = document?.title || "Untitled Document") => {
    if (!document?.id) return
    
    setSaving(true)
    try {
      const { document: updatedDoc, readabilityScore: newScore } = await api.updateDocument(document.id, {
        content: newContent,
        title,
      })

      setDocument(prev => prev ? {
        ...prev,
        title: updatedDoc.title,
        content: newContent,
        readability_score: newScore,
        last_edited_at: new Date().toISOString()
      } : null)
      
      setReadabilityScore(newScore)
    } catch (error: any) {
      console.error('Error saving document:', error)
      setError("Failed to save document")
      throw error
    } finally {
      setSaving(false)
    }
  }, [document?.id, document?.title])

  const applySuggestion = useCallback((suggestion: GrammarSuggestion) => {
    const newContent =
      content.slice(0, suggestion.startIndex) + suggestion.suggestedText + content.slice(suggestion.endIndex)

    setContent(newContent)
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    saveDocument(newContent)
  }, [content, saveDocument])

  const dismissSuggestion = useCallback((suggestionId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
  }, [])

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
    
    // Debounced suggestions (separate from save to avoid blocking)
    const timeoutId = setTimeout(() => {
      generateSuggestionsForContent(newContent)
    }, SUGGESTION_DEBOUNCE)

    return () => clearTimeout(timeoutId)
  }, [generateSuggestionsForContent])

  return {
    document,
    content,
    suggestions,
    readabilityScore,
    loading,
    saving,
    error,
    suggestionsLoading,
    fetchDocument,
    saveDocument,
    applySuggestion,
    dismissSuggestion,
    handleContentChange,
    setContent,
  }
} 