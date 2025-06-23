import { NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { paragraph } = await req.json()
    if (!paragraph || typeof paragraph !== "string" || paragraph.trim().length < 20) {
      return NextResponse.json({ error: "A valid paragraph is required." }, { status: 400 })
    }

    // Compose a prompt for citation suggestions
    const prompt = `Given the following academic paragraph, suggest 2-3 example citations (real or plausible) that could support the claims. Format each as a full citation (APA or MLA style) and include a short note on what aspect of the paragraph each citation supports.\n\nParagraph:\n${paragraph}\n\nCitations:`

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an academic writing assistant that suggests citation examples for paragraphs." },
        { role: "user", content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.7
    })

    const answer = completion.choices[0]?.message?.content?.trim() || "No suggestions found."
    return NextResponse.json({ citations: answer })
  } catch (error: any) {
    console.error("OpenAI citation error:", error)
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 })
  }
} 