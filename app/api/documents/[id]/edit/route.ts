import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { generateSuggestions } from "@/lib/grammar"
import { shouldCreateVersion, hashContent } from "@/lib/version-utils"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  try {
    const supabase = await createServerSupabase()

    // Resolve user ID (either via trusted header from middleware or fallback to Supabase Auth API)
    let userId = request.headers.get("x-supa-user")
    if (!userId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    const { content } = (await request.json()) as { content?: string }
    if (content === undefined) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // 1. Update the document with new content & readability
    const readabilityScore = calculateReadability(content)

    const { data: updatedDoc, error: updateError } = await supabase
      .from("documents")
      .update({
        content,
        readability_score: readabilityScore,
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 2. Versioning (avoid duplicates by hash)
    let versionCreated = false
    if (await shouldCreateVersion(params.id, content)) {
      const { error: versionError } = await supabase.from("document_versions").insert({
        document_id: params.id,
        content_snapshot: content,
        readability_score: readabilityScore,
        content_hash: hashContent(content),
      })
      if (!versionError) {
        versionCreated = true
      } else {
        console.error("Error creating version:", versionError)
      }
    }

    // 3. Generate and persist suggestions in one go
    const suggestions = generateSuggestions(content)
    if (suggestions.length) {
      const suggestionRows = suggestions.map((s) => ({
        document_id: params.id,
        start_index: s.startIndex,
        end_index: s.endIndex,
        suggestion_type: s.type,
        original_text: s.originalText,
        suggested_text: s.suggestedText,
        message: s.message,
      }))
      const { error: rpcError } = await supabase.rpc("save_suggestions", {
        doc_id: params.id,
        suggestions: suggestionRows,
      })
      if (rpcError) {
        console.error("Error saving suggestions:", rpcError)
      }
    }

    return NextResponse.json({ document: updatedDoc, suggestions, versionCreated })
  } catch (error) {
    console.error("Edit document API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`POST /api/documents/${params.id}/edit`, timer)
  }
} 