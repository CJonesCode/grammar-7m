import { NextResponse } from "next/server"

export async function GET() {
  try {
    // First check if API key exists
    const hasApiKey = !!process.env.OPENAI_API_KEY
    const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) + "..."

    console.log("OpenAI API Key Check:", {
      hasApiKey,
      keyPrefix: hasApiKey ? keyPrefix : "N/A",
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
    })

    if (!hasApiKey) {
      return NextResponse.json({
        status: "error",
        message: "OpenAI API key not found in environment variables",
        hasApiKey: false,
        instructions: "Add OPENAI_API_KEY=sk-... to your .env.local file",
      })
    }

    // Validate API key format
    if (!process.env.OPENAI_API_KEY?.startsWith("sk-")) {
      return NextResponse.json({
        status: "error",
        message: "Invalid API key format - should start with 'sk-'",
        hasApiKey: true,
        keyPrefix,
      })
    }

    // Dynamic import to avoid issues with OpenAI client initialization
    const { default: OpenAI } = await import("openai")

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    console.log("Testing OpenAI API connection...")

    // Test the API key with a simple request
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say 'API key works'" }],
      max_tokens: 10,
      temperature: 0,
    })

    console.log("OpenAI API test successful")

    return NextResponse.json({
      status: "success",
      message: "OpenAI API key is working correctly",
      hasApiKey: true,
      keyPrefix,
      testResponse: response.choices[0]?.message?.content,
      model: "gpt-4o-mini",
      usage: response.usage,
    })
  } catch (error: any) {
    console.error("OpenAI API test error:", error)

    // Handle different types of errors
    let errorMessage = "Unknown error occurred"
    let errorDetails = {}

    if (error.code === "invalid_api_key") {
      errorMessage = "Invalid API key - please check your OpenAI API key"
    } else if (error.code === "insufficient_quota") {
      errorMessage = "Insufficient quota - please check your OpenAI billing"
    } else if (error.code === "rate_limit_exceeded") {
      errorMessage = "Rate limit exceeded - please try again later"
    } else if (error.message) {
      errorMessage = error.message
    }

    if (error.response?.data) {
      errorDetails = error.response.data
    }

    return NextResponse.json(
      {
        status: "error",
        message: errorMessage,
        hasApiKey: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + "...",
        error: {
          type: error.type || "unknown",
          code: error.code || "unknown",
          status: error.status || error.response?.status,
          details: errorDetails,
        },
        fullError: process.env.NODE_ENV === "development" ? error.toString() : undefined,
      },
      { status: 500 },
    )
  }
}
