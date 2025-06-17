import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { calculateReadability } from "@/lib/readability"
import { hashContent } from "@/lib/version-utils"

export const runtime = "nodejs"

// Simple version check without external dependencies
async function shouldCreateVersionServer(supabase: any, documentId: string, content: string): Promise<boolean> {
  const contentHash = hashContent(content)

  try {
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get versions for document (verify ownership through join)
    const { data: versions, error } = await supabase
      .from("document_versions")
      .select(`
        *,
        documents!inner(user_id)
      `)
      .eq("document_id", params.id)
      .eq("documents.user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Remove the documents join data from response
    const cleanVersions = versions.map(({ documents, ...version }) => version)

    return NextResponse.json({ versions: cleanVersions })
  } catch (error) {
    console.error("Get versions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body

    if (content === undefined) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if we should create a new version (avoid duplicates)
    const shouldCreate = await shouldCreateVersionServer(supabase, params.id, content)
    if (!shouldCreate) {
      return NextResponse.json({ message: "Version already exists" })
    }

    // Calculate readability and content hash
    const readabilityScore = calculateReadability(content)
    const contentHash = hashContent(content)

    // Create version
    const { data: version, error } = await supabase
      .from("document_versions")
      .insert({
        document_id: params.id,
        content_snapshot: content,
        readability_score: readabilityScore,
        content_hash: contentHash,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ version }, { status: 201 })
  } catch (error) {
    console.error("Create version API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
