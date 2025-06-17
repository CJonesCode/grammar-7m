import { type NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase"
import { analyzeTextWithAI } from "@/lib/openai"
import { generateSuggestions } from "@/lib/grammar"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  console.log("Suggestions API called for document:", params.id)

  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("Auth check:", { user: !!user, error: authError?.message })

    if (authError || !user) {
      console.log("Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, useAI = false } = body

    console.log("Request body:", { contentLength: content?.length, useAI })

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    console.log("Document check:", { found: !!document, error: docError?.message })

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    let suggestions = []

    if (useAI && process.env.OPENAI_API_KEY) {
      console.log("Using AI for suggestions, API key present:", !!process.env.OPENAI_API_KEY)
      try {
        suggestions = await analyzeTextWithAI(content)
        console.log("AI suggestions generated:", suggestions.length)
      } catch (aiError) {
        console.error("AI analysis failed:", aiError)
        suggestions = generateSuggestions(content)
        console.log("Fallback to mock suggestions:", suggestions.length)
      }
    } else {
      console.log("Using mock suggestions, AI disabled or no API key")
      suggestions = generateSuggestions(content)
    }

    // Store suggestions in database
    if (suggestions.length > 0) {
      const suggestionRecords = suggestions.map((suggestion, index) => ({
        document_id: params.id,
        start_index: suggestion.startIndex,
        end_index: suggestion.endIndex,
        suggestion_type: suggestion.type,
        original_text: suggestion.originalText,
        suggested_text: suggestion.suggestedText,
        message: suggestion.message,
      }))

      // Clear existing suggestions first
      const { error: deleteError } = await supabase.from("suggestions").delete().eq("document_id", params.id)

      if (deleteError) {
        console.error("Error clearing suggestions:", deleteError)
      }

      // Insert new suggestions
      const { error: insertError } = await supabase.from("suggestions").insert(suggestionRecords)

      if (insertError) {
        console.error("Error inserting suggestions:", insertError)
      } else {
        console.log("Suggestions stored in database:", suggestionRecords.length)
      }
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Suggestions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get suggestions for document
    const { data: suggestions, error } = await supabase
      .from("suggestions")
      .select("*")
      .eq("document_id", params.id)
      .order("start_index", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Get suggestions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
