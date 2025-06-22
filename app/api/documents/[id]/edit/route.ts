import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { generateSuggestions } from "@/lib/grammar"
import { shouldCreateVersion, createVersion } from "@/lib/version-utils"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  const startTime = performance.now()
  console.log("🔄 API: PUT /api/documents/[id]/edit - Starting request for ID:", params.id)
  
  try {
    const supabase = await createServerSupabase()
    const clientTime = performance.now()
    console.log(`⏱️ API: Supabase client created in ${clientTime - startTime}ms`)
    
    let userId = request.headers.get("x-supa-user")
    console.log("🔑 API: User ID from header:", userId)
    
    if (!userId) {
      console.log("⚠️ API: No user header, getting user from session...")
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.log("❌ API: Auth error or no user:", authError?.message || "No user")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
      console.log("✅ API: Got user from session:", user.email)
    }

    const body = await request.json()
    const { title, content } = body
    console.log(`📝 API: Updating document - Title: "${title}", Content length: ${content?.length || 0} chars`)

    // Calculate readability score
    const readabilityStartTime = performance.now()
    const readabilityScore = calculateReadability(content || "")
    const readabilityEndTime = performance.now()
    console.log(`⏱️ API: Readability calculation completed in ${readabilityEndTime - readabilityStartTime}ms`)

    // Update document
    const dbStartTime = performance.now()
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
    const dbEndTime = performance.now()
    console.log(`⏱️ API: Database update completed in ${dbEndTime - dbStartTime}ms`)

    if (error) {
      console.log("❌ API: Database error:", error.message)
      return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
    }

    // Create version if content has changed significantly
    const versionStartTime = performance.now()
    const shouldCreate = await shouldCreateVersion(params.id, content || "", supabase)
    if (shouldCreate) {
      const versionCreated = await createVersion(params.id, content || "", readabilityScore, supabase)
      console.log(`📝 API: Version creation ${versionCreated ? 'successful' : 'failed'}`)
    } else {
      console.log("ℹ️ API: Version already exists, skipping creation")
    }
    const versionEndTime = performance.now()
    console.log(`⏱️ API: Version handling completed in ${versionEndTime - versionStartTime}ms`)

    console.log(`✅ API: Document updated successfully - "${updatedDocument.title}" (${updatedDocument.content?.length || 0} chars)`)
    console.log("📋 API: Updated document data:", JSON.stringify({
      documentId: updatedDocument.id,
      title: updatedDocument.title,
      contentLength: updatedDocument.content?.length || 0,
      readabilityScore: updatedDocument.readability_score,
      lastEditedAt: updatedDocument.last_edited_at
    }, null, 2))

    const totalTime = performance.now()
    console.log(`✅ API: Total request time ${totalTime - startTime}ms`)

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