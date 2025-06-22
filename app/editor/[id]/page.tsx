"use client"

import { useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDocument } from "@/hooks/use-document"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { SuggestionItem } from "@/components/suggestion-item"
import { AutosaveSpinner } from "@/components/autosave-spinner"
import { VersionHistoryDrawer } from "@/components/version-history-drawer"
import { safeRound } from "@/lib/utils"

const AUTOSAVE_DELAY = 2000 // 2 seconds

interface EditorPageProps {
  params: {
    id: string
  }
}

export default function EditorPage({ params }: EditorPageProps) {
  const router = useRouter()
  const {
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
  } = useDocument(params.id)

  const handleRestoreVersion = useCallback((versionContent: string) => {
    setContent(versionContent)
    handleContentChange(versionContent)
  }, [setContent, handleContentChange])

  useEffect(() => {
    fetchDocument()
  }, [fetchDocument])

  if (error) {
    return (
      <PageLayout title="Error">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Document</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchDocument()}>Try Again</Button>
        </div>
      </PageLayout>
    )
  }

  if (loading) {
    return (
      <PageLayout title="Loading...">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[60vh]" />
        </div>
      </PageLayout>
    )
  }

  if (!document) {
    return (
      <PageLayout title="Not Found">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold text-gray-600 mb-4">Document Not Found</h2>
          <p className="text-gray-500 mb-4">This document may have been deleted or moved.</p>
          <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title={document.title}
      headerContent={
        <div className="flex items-center space-x-4 ml-4">
          <AutosaveSpinner 
            isActive={saving} 
            duration={AUTOSAVE_DELAY}
            onComplete={() => {}}
          />
          <VersionHistoryDrawer 
            documentId={document.id} 
            onRestoreVersion={handleRestoreVersion}
          />
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="min-h-[60vh] text-lg leading-relaxed"
            placeholder="Start writing..."
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Readability Stats */}
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-3">Document Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Words:</span>
                <span>{readabilityScore?.wordCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Reading Level:</span>
                <span>{readabilityScore ? safeRound(readabilityScore.fleschReadingEase) + "/100" : "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Grade Level:</span>
                <span>{readabilityScore ? safeRound(readabilityScore.fleschKincaidGrade) : "N/A"}</span>
              </div>
            </div>
          </Card>

          {/* Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Suggestions</h3>
              {suggestionsLoading && (
                <AutosaveSpinner 
                  isActive={true} 
                  duration={1000}
                  onComplete={() => {}}
                />
              )}
            </div>
            <div className="space-y-3">
              {suggestions.length === 0 ? (
                <p className="text-sm text-gray-500">No suggestions yet. Keep writing!</p>
              ) : (
                suggestions.map((suggestion) => (
                  <SuggestionItem
                    key={suggestion.id}
                    suggestion={suggestion}
                    onApply={applySuggestion}
                    onDismiss={dismissSuggestion}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}
