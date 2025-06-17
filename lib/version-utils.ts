import { createClient } from "@/lib/supabase/client"

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
export async function shouldCreateVersion(documentId: string, content: string): Promise<boolean> {
  const contentHash = hashContent(content)

  try {
    const supabase = createClient()
    const { data } = await supabase
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
