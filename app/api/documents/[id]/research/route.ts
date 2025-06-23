import { type NextRequest, NextResponse } from "next/server"
import { startTimer, endTimer } from "@/lib/debug"
import { createServerSupabase } from "@/lib/supabase-server"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Verify document ownership
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id, title, content")
      .eq("id", params.id)
      .eq("user_id", userId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: "OpenAI API not configured" }, { status: 500 })
    }

    // Extract key topics from the document
    const documentText = document.content || document.title || ""
    if (!documentText.trim()) {
      return NextResponse.json({ error: "Document is empty" }, { status: 400 })
    }

    // Create a research guidance prompt
    const researchPrompt = `You are a research assistant helping a graduate student with their thesis. Based on the following document content, provide specific guidance on where to look for additional research and sources.

Document Title: ${document.title}
Document Content: ${documentText.substring(0, 2000)}...

Please provide:
1. 3-5 key research areas or topics to explore
2. Specific academic databases or journals to search
3. 2-3 seminal papers or authors in this field
4. Related research methodologies to consider
5. Potential gaps in the current research that could be addressed

Format your response as a structured list with clear headings. Keep it concise but helpful for academic research.`

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful research assistant specializing in academic writing and thesis guidance. Provide clear, actionable research advice."
          },
          {
            role: "user",
            content: researchPrompt
          }
        ],
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json()
      console.error("❌ OpenAI API error:", errorData)
      return NextResponse.json({ error: "Failed to generate research guidance" }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()
    const researchGuidance = openaiData.choices[0]?.message?.content || "Unable to generate research guidance."

    return NextResponse.json({ 
      researchGuidance,
      documentTitle: document.title,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error("❌ Research API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    endTimer(`POST /api/documents/${params.id}/research`, timer)
  }
} 