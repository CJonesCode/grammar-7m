import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateSuggestions } from "@/lib/grammar"

export const runtime = "nodejs"

// Fallback function using fetch API
async function analyzeTextWithFetch(text: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional grammar and style checker for academic writing. Analyze the provided text and return suggestions in JSON format.

For each issue found, provide:
- startIndex: character position where the issue starts
- endIndex: character position where the issue ends  
- type: "grammar", "spelling", or "style"
- originalText: the problematic text
- suggestedText: the corrected text
- message: explanation of the issue

Return only valid JSON array format. If no issues found, return empty array [].

Example format:
[
  {
    "startIndex": 0,
    "endIndex": 4,
    "type": "spelling",
    "originalText": "teh",
    "suggestedText": "the",
    "message": "Spelling error: 'teh' should be 'the'"
  }
]`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
  }

  const data = await response.json()
  const content = data.choices[0]?.message?.content

  if (!content) {
    return []
  }

  try {
    // Clean the response in case it has markdown formatting
    const cleanContent = content
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim()

    const suggestions = JSON.parse(cleanContent)
    if (Array.isArray(suggestions)) {
      // Validate suggestion format
      return suggestions.filter((suggestion) => {
        return (
          typeof suggestion.startIndex === "number" &&
          typeof suggestion.endIndex === "number" &&
          typeof suggestion.type === "string" &&
          typeof suggestion.originalText === "string" &&
          typeof suggestion.suggestedText === "string" &&
          typeof suggestion.message === "string"
        )
      })
    }
    return []
  } catch (parseError) {
    console.error("Failed to parse OpenAI response as JSON:", parseError)
    return []
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] Suggestions API called for document:`, params.id)

  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log(`[${new Date().toISOString()}] Auth check:`, {
      hasUser: !!user,
      userId: user?.id,
      error: authError?.message,
    })

    if (authError || !user) {
      console.log(`[${new Date().toISOString()}] Unauthorized access attempt`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { content, useAI = true } = body

    console.log(`[${new Date().toISOString()}] Request details:`, {
      contentLength: content?.length,
      useAI,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      openAIKeyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + "...",
    })

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

    console.log(`[${new Date().toISOString()}] Document check:`, {
      found: !!document,
      error: docError?.message,
    })

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    let suggestions = []
    let usedAI = false
    let aiMethod = "none"

    if (useAI && process.env.OPENAI_API_KEY) {
      console.log(`[${new Date().toISOString()}] Attempting AI analysis...`)

      try {
        // Try with OpenAI client first
        const { analyzeTextWithAI } = await import("@/lib/openai")
        suggestions = await analyzeTextWithAI(content)
        usedAI = true
        aiMethod = "openai-client"
        console.log(`[${new Date().toISOString()}] AI analysis successful via client:`, {
          suggestionsCount: suggestions.length,
          timeTaken: Date.now() - startTime + "ms",
        })
      } catch (aiError: any) {
        console.error(`[${new Date().toISOString()}] OpenAI client failed:`, aiError.message)

        // Fallback to fetch API
        try {
          suggestions = await analyzeTextWithFetch(content)
          usedAI = true
          aiMethod = "fetch"
          console.log(`[${new Date().toISOString()}] AI analysis successful via fetch:`, {
            suggestionsCount: suggestions.length,
            timeTaken: Date.now() - startTime + "ms",
          })
        } catch (fetchError: any) {
          console.error(`[${new Date().toISOString()}] Fetch API also failed:`, fetchError.message)
          suggestions = generateSuggestions(content)
          aiMethod = "mock-fallback"
          console.log(`[${new Date().toISOString()}] Fallback to mock suggestions:`, suggestions.length)
        }
      }
    } else {
      console.log(`[${new Date().toISOString()}] Using mock suggestions (AI disabled or no API key)`)
      suggestions = generateSuggestions(content)
      aiMethod = "mock"
    }

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

      // Clear existing suggestions first
      const { error: deleteError } = await supabase.from("suggestions").delete().eq("document_id", params.id)

      if (deleteError) {
        console.error(`[${new Date().toISOString()}] Error clearing suggestions:`, deleteError)
      }

      // Insert new suggestions
      const { error: insertError } = await supabase.from("suggestions").insert(suggestionRecords)

      if (insertError) {
        console.error(`[${new Date().toISOString()}] Error inserting suggestions:`, insertError)
      } else {
        console.log(`[${new Date().toISOString()}] Suggestions stored in database:`, suggestionRecords.length)
      }
    }

    console.log(`[${new Date().toISOString()}] API call completed:`, {
      totalTime: Date.now() - startTime + "ms",
      suggestionsReturned: suggestions.length,
      usedAI,
      aiMethod,
    })

    return NextResponse.json({
      suggestions,
      meta: {
        usedAI,
        aiMethod,
        processingTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] Suggestions API error:`, {
      message: error.message,
      stack: error.stack,
      totalTime: Date.now() - startTime + "ms",
    })
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

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
