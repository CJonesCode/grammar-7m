import { ReadabilityScore } from "./readability"
import { GrammarSuggestion } from "./grammar"

interface Document {
  id: string
  title: string
  content: string
  readability_score: ReadabilityScore
  last_edited_at: string
  created_at: string
  word_count?: number
}

interface ApiError extends Error {
  status?: number
}

interface ApiClientOptions {
  baseUrl?: string
  timeout?: number
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private timeout: number
  private headers: Record<string, string>

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || ""
    this.timeout = options.timeout || 5000
    this.headers = {
      "Content-Type": "application/json",
      ...options.headers,
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        const error = new Error("API request failed") as ApiError
        error.status = response.status
        throw error
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // Document endpoints
  async getDocuments(): Promise<{ documents: Document[] }> {
    return this.request("/api/documents", {
      method: "GET",
      headers: {
        "Cache-Control": "max-age=60",
      },
    })
  }

  async getDocument(id: string): Promise<{ document: Document }> {
    return this.request(`/api/documents/${id}`)
  }

  async createDocument(title: string, content: string = ""): Promise<{ document: Document }> {
    return this.request("/api/documents", {
      method: "POST",
      body: JSON.stringify({ title, content }),
    })
  }

  async updateDocument(
    id: string,
    data: { title?: string; content?: string }
  ): Promise<{ document: Document; readabilityScore: ReadabilityScore }> {
    return this.request(`/api/documents/${id}/edit`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async deleteDocument(id: string): Promise<void> {
    return this.request(`/api/documents/${id}`, {
      method: "DELETE",
    })
  }

  // Suggestions endpoint
  async getSuggestions(
    documentId: string,
    content: string
  ): Promise<{ suggestions: GrammarSuggestion[] }> {
    return this.request(`/api/documents/${documentId}/suggestions`, {
      method: "POST",
      body: JSON.stringify({ content }),
    })
  }

  // Version history endpoints
  async getVersions(documentId: string): Promise<{ versions: any[] }> {
    return this.request(`/api/documents/${documentId}/versions`)
  }
}

// Create and export a singleton instance
export const api = new ApiClient()

// Also export the class for testing or custom instances
export { ApiClient }
export type { Document, ApiError, ApiClientOptions } 