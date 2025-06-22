import { useCallback, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { api, type Document } from "@/lib/api-client"

export function useDocuments() {
  const { refreshSession } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchDocuments = useCallback(async () => {
    try {
      const { documents: data } = await api.getDocuments()
      setDocuments(data || [])
    } catch (error: any) {
      if (error.status === 401) {
        try {
          await refreshSession()
          const { documents: data } = await api.getDocuments()
          setDocuments(data || [])
        } catch (refreshError) {
          console.error("❌ Dashboard: Failed to refresh session:", refreshError)
          window.location.href = '/login'
        }
      } else {
        console.error("❌ Dashboard: Fetch error:", error)
        setError(error.message)
        
        // Retry once after 2 seconds for network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setTimeout(() => {
            fetchDocuments()
          }, 2000)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [refreshSession])

  const deleteDocument = async (docId: string, docTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${docTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      await api.deleteDocument(docId)
      setDocuments(docs => docs.filter((doc) => doc.id !== docId))
    } catch (error: any) {
      setError(error.message)
    }
  }

  const createDocument = async (title: string) => {
    try {
      const { document: data } = await api.createDocument(title)
      setDocuments(docs => [data, ...docs])
      return data
    } catch (error: any) {
      setError(error.message)
      throw error
    }
  }

  return {
    documents,
    loading,
    error,
    fetchDocuments,
    deleteDocument,
    createDocument,
  }
} 