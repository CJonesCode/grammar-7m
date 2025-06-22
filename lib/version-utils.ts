import { createServerClient } from '@supabase/ssr'

// Simple hash function for content comparison
export function hashContent(content: string): string {
  let hash = 0
  if (content.length === 0) return hash.toString()

  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }

  return Math.abs(hash).toString()
}

// Check if a version with the same content hash already exists
export async function shouldCreateVersion(
  documentId: string, 
  content: string, 
  supabaseClient: any
): Promise<boolean> {
  const contentHash = hashContent(content)

  try {
    const { data } = await supabaseClient
      .from("document_versions")
      .select("id")
      .eq("document_id", documentId)
      .eq("content_hash", contentHash)
      .limit(1)

    return !data || data.length === 0
  } catch (error) {
    console.error("Error checking version:", error)
    return true // Default to creating version if check fails
  }
}

// Create a version for a document
export async function createVersion(
  documentId: string,
  content: string,
  readabilityScore: any,
  supabaseClient: any
): Promise<boolean> {
  const contentHash = hashContent(content)

  try {
    const { error } = await supabaseClient
      .from("document_versions")
      .insert({
        document_id: documentId,
        content_snapshot: content,
        readability_score: readabilityScore,
        content_hash: contentHash,
      })

    if (error) {
      console.error("Error creating version:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error creating version:", error)
    return false
  }
}
