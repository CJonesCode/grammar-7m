import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { startTimer, endTimer } from "@/lib/debug"

export async function GET(request: NextRequest) {
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

    // Use the optimized function for better performance
    const { data: documents, error } = await supabase.rpc('get_user_documents', {
      user_uuid: userId,
      limit_count: 20
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Enhanced caching headers for better performance
    const response = NextResponse.json({ documents })
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300') // Cache for 1 minute, stale for 5 minutes
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
