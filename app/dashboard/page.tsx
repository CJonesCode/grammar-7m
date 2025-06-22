"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDocuments } from "@/hooks/use-documents"
import { CreateDocumentDialog } from "@/components/create-document-dialog"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { safeRound } from "@/lib/utils"

export default function DashboardPage() {
  const router = useRouter()
  const { documents, loading, error, fetchDocuments, deleteDocument, createDocument } = useDocuments()

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  if (error) {
    return (
      <PageLayout title="Dashboard">
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Documents</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => fetchDocuments()}>Try Again</Button>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout 
      title="Dashboard"
      headerContent={
        <CreateDocumentDialog 
          onDocumentCreated={async (doc) => {
            try {
              const newDoc = await createDocument(doc.title)
              router.push(`/editor/${newDoc.id}`)
            } catch (error) {
              // Error is already handled in the hook
            }
          }}
        />
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : documents.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center min-h-[60vh]">
            <h2 className="text-2xl font-bold text-gray-600 mb-4">No Documents Yet</h2>
            <p className="text-gray-500 mb-4">Create your first document to get started!</p>
            <CreateDocumentDialog 
              onDocumentCreated={async (doc) => {
                try {
                  const newDoc = await createDocument(doc.title)
                  router.push(`/editor/${newDoc.id}`)
                } catch (error) {
                  // Error is already handled in the hook
                }
              }}
            />
          </div>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="truncate">{doc.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-800 hover:bg-red-100"
                    onClick={() => deleteDocument(doc.id, doc.title)}
                  >
                    Delete
                  </Button>
                </CardTitle>
                <CardDescription>
                  Last edited: {new Date(doc.last_edited_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{doc.word_count || 0} words</span>
                  <span>
                    Score: {doc.readability_score ? safeRound(doc.readability_score.fleschReadingEase) : "N/A"}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full mt-4"
                  onClick={() => router.push(`/editor/${doc.id}`)}
                >
                  Open Document
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageLayout>
  )
}
