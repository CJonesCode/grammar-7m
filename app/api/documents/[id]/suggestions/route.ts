import { type NextRequest, NextResponse } from "next/server"
import { generateSuggestions } from "@/lib/grammar"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = startTimer()
  const startTime = performance.now()
  console.log("🔄 API: POST /api/documents/[id]/suggestions - Starting request for ID:", params.id)
  
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
    const { content } = body
    console.log(`📝 API: Received content for suggestions (${content?.length || 0} chars)`)

    if (!content) {
      console.log("❌ API: No content provided")
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    // Verify document ownership
    const verifyStartTime = performance.now()
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single()
    const verifyEndTime = performance.now()
    console.log(`⏱️ API: Document verification completed in ${verifyEndTime - verifyStartTime}ms`)

    if (docError || !document) {
      console.log("❌ API: Document not found or access denied")
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Generate mock suggestions using the grammar library
    const suggestionStartTime = performance.now()
    const suggestions = generateSuggestions(content)
    const suggestionEndTime = performance.now()
    console.log(`⏱️ API: Suggestions generated in ${suggestionEndTime - suggestionStartTime}ms`)
    console.log(`💡 API: Generated ${suggestions.length} suggestions`)

    // Store suggestions in database
    if (suggestions.length > 0) {
      const saveStartTime = performance.now()
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
      const saveEndTime = performance.now()
      console.log(`⏱️ API: Suggestions saved to database in ${saveEndTime - saveStartTime}ms`)

      if (rpcError) {
        console.error("❌ API: Error saving suggestions (RPC):", rpcError)
      }
    }

    console.log("📋 API: Suggestions data:", JSON.stringify(suggestions, null, 2))
    const totalTime = performance.now()
    console.log(`✅ API: Total suggestions request time ${totalTime - startTime}ms`)
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("❌ API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`POST /api/documents/${params.id}/suggestions`, timer)
  }
}

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
  } finally {
    endTimer(`GET /api/documents/${params.id}/suggestions`, timer)
  }
}
