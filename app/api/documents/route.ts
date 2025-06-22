import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { startTimer, endTimer } from "@/lib/debug"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const timer = startTimer()
  const startTime = performance.now()
  console.log("🔄 API: GET /api/documents - Starting request")
  
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

    // Get documents for the authenticated user
    const dbStartTime = performance.now()
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, title, readability_score, last_edited_at")
      .eq("user_id", userId)
      .order("last_edited_at", { ascending: false })
    const dbEndTime = performance.now()
    console.log(`⏱️ API: Database query completed in ${dbEndTime - dbStartTime}ms`)

    if (error) {
      console.log("❌ API: Database error:", error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`📄 API: Retrieved ${documents?.length || 0} documents for user ${userId}`)
    console.log("📋 API: Documents data:", JSON.stringify(documents, null, 2))
    
    const totalTime = performance.now()
    console.log(`✅ API: Total request time ${totalTime - startTime}ms`)
    return NextResponse.json({ documents })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer("GET /api/documents", timer)
  }
}

export async function POST(request: NextRequest) {
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
    const { title, content = "" } = body

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Create new document
    const { data: document, error } = await supabase
      .from("documents")
      .insert({
        title: title.trim(),
        content,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error("Create document API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer("POST /api/documents", timer)
  }
}
