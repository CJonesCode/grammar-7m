import { type NextRequest, NextResponse } from "next/server"
import { generateSuggestions } from "@/lib/grammar"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  try {
    const supabase = createServerSupabase()
    let userId = request.headers.get("x-supa-user")
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    const body = await request.json()
    const { content } = body

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Generate mock suggestions using the grammar library
    const suggestions: any[] = [] // Suggestion engine disabled temporarily

    // Store suggestions in database
    if (suggestions.length > 0) {
      const suggestionRecords = suggestions.map((suggestion) => ({
        document_id: params.id,
        start_index: suggestion.startIndex,
        end_index: suggestion.endIndex,
        suggestion_type: suggestion.type,
        original_text: suggestion.originalText,
        suggested_text: suggestion.suggestedText,
        message: suggestion.message,
      }))

      // Persist suggestions in a single round-trip via Postgres RPC.
      const { error: rpcError } = await supabase.rpc("save_suggestions", {
        doc_id: params.id,
        suggestions: suggestionRecords,
      })

      if (rpcError) {
        console.error("Error saving suggestions (RPC):", rpcError)
      }
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Suggestions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`POST /api/documents/${params.id}/suggestions`, timer)
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  try {
    const supabase = createServerSupabase()
    let userId = request.headers.get("x-supa-user")
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      userId = user.id
    }

    // Get suggestions for document
    const { data: suggestions, error } = await supabase
      .from("suggestions")
      .select("*")
      .eq("document_id", params.id)
      .eq("user_id", userId)
      .order("start_index", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Get suggestions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`GET /api/documents/${params.id}/suggestions`, timer)
  }
}
