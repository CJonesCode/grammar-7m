import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabase-server"
import { startTimer, endTimer } from "@/lib/debug"

export async function GET(request: NextRequest) {
  const timer = startTimer()
  try {
    const supabase = createServerSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get documents for the authenticated user
    const { data: documents, error } = await supabase
      .from("documents")
      .select("id, title, readability_score, last_edited_at")
      .eq("user_id", user.id)
      .order("last_edited_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Documents API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer("GET /api/documents", timer)
  }
}

export async function POST(request: NextRequest) {
  const timer = startTimer()
  try {
    const supabase = createServerSupabase()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
        user_id: user.id,
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
