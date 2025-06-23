import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { shouldCreateVersion, createVersion } from "@/lib/version-utils"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  
  try {
    const supabase = await createServerSupabase()
    
    let userId = request.headers.get("x-supa-user")
    
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    const body = await request.json()
    const { title, content: newContent } = body

    // 1. Fetch the current document to get the old content
    const { data: existingDocument, error: fetchError } = await supabase
      .from("documents")
      .select("content, readability_score")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single()

    if (fetchError || !existingDocument) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 })
    }

    // 2. Decide if a version of the *old* content should be created
    const oldContent = existingDocument.content || ""
    const shouldCreate = await shouldCreateVersion(params.id, oldContent, supabase)
    if (shouldCreate) {
      await createVersion(params.id, oldContent, existingDocument.readability_score, supabase)
    }

    // 3. Calculate new readability score for the new content
    const newReadabilityScore = calculateReadability(newContent || "")

    // 4. Update the main document with the new content
    const { data: updatedDocument, error: updateError } = await supabase
      .from("documents")
      .update({
        title: title || "Untitled Document",
        content: newContent || "",
        readability_score: newReadabilityScore,
        last_edited_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select("id, title, content, readability_score, last_edited_at")
      .single()

    if (updateError) {
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
    }

    return NextResponse.json({
      documentId: updatedDocument.id,
      title: updatedDocument.title,
      content: updatedDocument.content || "",
      readabilityScore: updatedDocument.readability_score
    })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`PUT /api/documents/${params.id}/edit`, timer)
  }
} 