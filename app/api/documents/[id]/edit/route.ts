import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { generateSuggestions } from "@/lib/grammar"
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
    const { title, content } = body

    // Calculate readability score
    const readabilityScore = calculateReadability(content || "")

    // Update document
    const { data: updatedDocument, error } = await supabase
      .from("documents")
      .update({
        title: title || "Untitled Document",
        content: content || "",
        readability_score: readabilityScore,
        last_edited_at: new Date().toISOString()
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select("id, title, content, readability_score, last_edited_at")
      .single()

    if (error) {
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
    }

    // Create version if content has changed significantly
    const shouldCreate = await shouldCreateVersion(params.id, content || "", supabase)
    if (shouldCreate) {
      await createVersion(params.id, content || "", readabilityScore, supabase)
    }

    return NextResponse.json({
      documentId: updatedDocument.id,
      title: updatedDocument.title,
      contentLength: updatedDocument.content?.length || 0,
      readabilityScore: updatedDocument.readability_score
    })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`PUT /api/documents/${params.id}/edit`, timer)
  }
} 