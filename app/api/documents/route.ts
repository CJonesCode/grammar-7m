import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { startTimer, endTimer } from "@/lib/debug"

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

    // Use the optimized function for better performance
    const dbStartTime = performance.now()
    const { data: documents, error } = await supabase.rpc('get_user_documents', {
      user_uuid: userId,
      limit_count: 20
    })
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
    
    // Enhanced caching headers for better performance
    const response = NextResponse.json({ documents })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300') // Cache for 1 minute, stale for 5 minutes
    response.headers.set('X-Response-Time', `${totalTime - startTime}ms`)
    response.headers.set('X-Document-Count', `${documents?.length || 0}`)
    response.headers.set('X-Cache-Status', 'MISS')
    return response
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
