import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET() {
  try {
    // Verify we're running on the server
    if (typeof window !== "undefined") {
      return NextResponse.json(
        {
          status: "error",
          message: "This API route should only run on the server",
        },
        { status: 500 },
      )
    }

    // Check if API key exists
    const hasApiKey = !!process.env.OPENAI_API_KEY
    const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) + "..."

    console.log("OpenAI API Key Check:", {
      hasApiKey,
      keyPrefix: hasApiKey ? keyPrefix : "N/A",
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      runtime: "nodejs",
    })

    if (!hasApiKey) {
      return NextResponse.json({
        status: "error",
        message: "OpenAI API key not found in environment variables",
        hasApiKey: false,
        instructions: "The OpenAI API key should be available through v0's environment variables",
        availableEnvVars: Object.keys(process.env).filter((key) => key.includes("OPENAI")),
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

    // Dynamic import to ensure server-side execution
    const { default: OpenAI } = await import("openai")

    // Initialize OpenAI client with explicit server configuration
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: false,
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
      runtime: "nodejs",
    })
  } catch (error: any) {
    console.error("OpenAI API test error:", error)

    // Handle different types of errors
    let errorMessage = "Unknown error occurred"
    let errorDetails = {}

    if (error.message?.includes("browser-like environment")) {
      errorMessage = "Runtime environment issue - trying alternative approach"

      // Try with fetch API as fallback
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Say 'API key works via fetch'" }],
            max_tokens: 10,
            temperature: 0,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          return NextResponse.json({
            status: "success",
            message: "OpenAI API key is working correctly (via fetch)",
            hasApiKey: true,
            keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) + "...",
            testResponse: data.choices[0]?.message?.content,
            model: "gpt-4o-mini",
            usage: data.usage,
            method: "fetch",
          })
        } else {
          const errorData = await response.json()
          throw new Error(`API request failed: ${errorData.error?.message || response.statusText}`)
        }
      } catch (fetchError: any) {
        errorMessage = `Both OpenAI client and fetch failed: ${fetchError.message}`
      }
    } else if (error.code === "invalid_api_key") {
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
        runtime: "nodejs",
      },
      { status: 500 },
    )
  }
}
