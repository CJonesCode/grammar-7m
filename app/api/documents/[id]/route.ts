import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  const startTime = performance.now()
  console.log("🔄 API: GET /api/documents/[id] - Starting request for ID:", params.id)
  
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

    // Get document (RLS will ensure user can only access their own documents)
    const dbStartTime = performance.now()
    const { data: document, error } = await supabase
      .from("documents")
      .select("id, title, content, readability_score, last_edited_at")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single()
    const dbEndTime = performance.now()
    console.log(`⏱️ API: Database query completed in ${dbEndTime - dbStartTime}ms`)

    if (error) {
      console.log("❌ API: Database error:", error.message)
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    console.log(`📄 API: Retrieved document "${document.title}" (${document.content?.length || 0} chars)`)
    console.log("📋 API: Document data:", JSON.stringify({
      id: document.id,
      title: document.title,
      contentLength: document.content?.length || 0,
      readabilityScore: document.readability_score,
      lastEditedAt: document.last_edited_at
    }, null, 2))

    const totalTime = performance.now()
    console.log(`✅ API: Total request time ${totalTime - startTime}ms`)
    
    // Add caching headers for better performance
    const response = NextResponse.json({ document })
    response.headers.set('Cache-Control', 'private, max-age=60') // Cache for 1 minute
    return response
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`GET /api/documents/${params.id}`, timer)
  }
}

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
    const { data: document, error } = await supabase
      .from("documents")
      .update({
        ...(title && { title: title.trim() }),
        ...(content !== undefined && { content }),
        readability_score: readabilityScore,
        last_edited_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", userId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Update document API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`PUT /api/documents/${params.id}`, timer)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Delete document (versions will be cascade deleted)
    const { error } = await supabase.from("documents").delete().eq("id", params.id).eq("user_id", userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete document API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`DELETE /api/documents/${params.id}`, timer)
  }
}
