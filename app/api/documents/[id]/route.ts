import { type NextRequest, NextResponse } from "next/server"
import { calculateReadability } from "@/lib/readability"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get document (RLS will ensure user can only access their own documents)
    const { data: document, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single()

    if (error) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Get document API error:", error)
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
