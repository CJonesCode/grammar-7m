import { useState, useRef, useEffect, useCallback } from "react"

interface Options {
  documentId: string
  initialContent: string
  initialTitle: string
  autosaveDelay?: number // ms
  onSaveSuccess?: (data: any) => void
}

interface Return {
  autosaveActive: boolean
  savedAt: Date | null
  requestSave: (content: string, title: string) => void
  manualSave: (content: string, title: string) => void
  handleTitleBlur: (currentContent: string, newTitle: string) => void
}

// Centralised save controller: debounces save requests, exposes spinner flag.
export function useSaveController({
  documentId,
  initialContent,
  initialTitle,
  autosaveDelay = 2000,
  onSaveSuccess,
}: Options): Return {
  const [autosaveActive, setAutosaveActive] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const pendingContentRef = useRef<string>(initialContent)
  const pendingTitleRef = useRef<string>(initialTitle)

  useEffect(() => {
    pendingContentRef.current = initialContent
  }, [initialContent])

  useEffect(() => {
    pendingTitleRef.current = initialTitle
  }, [initialTitle])

  const autosaveActiveRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const saveDocument = useCallback(async (content: string, title: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/edit`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, title }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      onSaveSuccess?.(data)
      setSavedAt(new Date())
    } catch (err) {
      console.error("❌ SaveController: failed to save", err)
    }
  }, [documentId, onSaveSuccess])

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const startSpinner = () => {
    if (!autosaveActiveRef.current) {
      setAutosaveActive(true)
      autosaveActiveRef.current = true
    }
  }

  const stopSpinner = () => {
    setAutosaveActive(false)
    autosaveActiveRef.current = false
  }

  const requestSave = (content: string, title: string) => {
    pendingContentRef.current = content
    pendingTitleRef.current = title
    clearTimer()
    startSpinner()
    timerRef.current = setTimeout(() => {
      saveDocument(pendingContentRef.current, pendingTitleRef.current).finally(() => {
        stopSpinner()
        timerRef.current = null
      })
    }, autosaveDelay)
  }

  const manualSave = (content: string, title: string) => {
    clearTimer()
    startSpinner()
    saveDocument(content, title).finally(() => stopSpinner())
  }

  const handleTitleBlur = (currentContent: string, newTitle: string) => {
    if (newTitle.trim() !== pendingTitleRef.current.trim()) {
      manualSave(currentContent, newTitle.trim() || "Untitled Document")
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimer()
  }, [])

  return {
    autosaveActive,
    savedAt,
    requestSave,
    manualSave,
    handleTitleBlur,
  }
} 