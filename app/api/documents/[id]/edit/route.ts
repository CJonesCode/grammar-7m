import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { generateSuggestions } from "@/lib/grammar"
import { shouldCreateVersion, hashContent } from "@/lib/version-utils"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export const runtime = "edge"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  const startTime = performance.now()
  console.log("🔄 API: POST /api/documents/[id]/edit - Starting request for ID:", params.id)
  
  try {
    const supabase = await createServerSupabase()
    const clientTime = performance.now()
    console.log(`⏱️ API: Supabase client created in ${clientTime - startTime}ms`)

    // Resolve user ID (either via trusted header from middleware or fallback to Supabase Auth API)
    let userId = request.headers.get("x-supa-user")
    console.log("🔑 API: User ID from header:", userId)
    
    if (!userId) {
      console.log("⚠️ API: No user header, getting user from session...")
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError || !user) {
        console.log("❌ API: Auth error or no user:", authError?.message || "No user")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
      console.log("✅ API: Got user from session:", user.email)
    }

    const { content } = (await request.json()) as { content?: string }
    console.log(`📝 API: Received content for edit (${content?.length || 0} chars)`)
    
    if (content === undefined) {
      console.log("❌ API: No content provided")
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // 1. Update the document with new content & readability
    const readabilityStartTime = performance.now()
    const readabilityScore = calculateReadability(content)
    const readabilityEndTime = performance.now()
    console.log(`⏱️ API: Readability calculated in ${readabilityEndTime - readabilityStartTime}ms`)

    const updateStartTime = performance.now()
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
    const updateEndTime = performance.now()
    console.log(`⏱️ API: Document updated in ${updateEndTime - updateStartTime}ms`)

    if (updateError) {
      console.log("❌ API: Update error:", updateError.message)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // 2. Versioning (avoid duplicates by hash)
    let versionCreated = false
    const versionStartTime = performance.now()
    if (await shouldCreateVersion(params.id, content)) {
      const { error: versionError } = await supabase.from("document_versions").insert({
        document_id: params.id,
        content_snapshot: content,
        readability_score: readabilityScore,
        content_hash: hashContent(content),
      })
      if (!versionError) {
        versionCreated = true
        console.log("✅ API: Version created successfully")
      } else {
        console.error("❌ API: Error creating version:", versionError)
      }
    } else {
      console.log("ℹ️ API: Version already exists, skipping")
    }
    const versionEndTime = performance.now()
    console.log(`⏱️ API: Versioning completed in ${versionEndTime - versionStartTime}ms`)

    // 3. Generate and persist suggestions in one go
    const suggestionsStartTime = performance.now()
    const suggestions = generateSuggestions(content)
    console.log(`💡 API: Generated ${suggestions.length} suggestions`)
    
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
        console.error("❌ API: Error saving suggestions:", rpcError)
      } else {
        console.log("✅ API: Suggestions saved successfully")
      }
    }
    const suggestionsEndTime = performance.now()
    console.log(`⏱️ API: Suggestions processing completed in ${suggestionsEndTime - suggestionsStartTime}ms`)

    console.log("📋 API: Edit response data:", JSON.stringify({
      documentId: updatedDoc.id,
      title: updatedDoc.title,
      contentLength: updatedDoc.content?.length || 0,
      suggestionsCount: suggestions?.length || 0,
      versionCreated,
      readabilityScore: updatedDoc.readability_score
    }, null, 2))

    const totalTime = performance.now()
    console.log(`✅ API: Total edit request time ${totalTime - startTime}ms`)
    return NextResponse.json({ document: updatedDoc, suggestions, versionCreated })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`POST /api/documents/${params.id}/edit`, timer)
  }
} 