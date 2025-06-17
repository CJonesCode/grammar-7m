export interface AIGrammarSuggestion {
  startIndex: number
  endIndex: number
  type: "grammar" | "spelling" | "style"
  originalText: string
  suggestedText: string
  message: string
  confidence?: number
}

export async function analyzeTextWithAI(text: string): Promise<AIGrammarSuggestion[]> {
  if (!text.trim()) {
    console.log("Empty text provided to AI analysis")
    return []
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not found")
    throw new Error("OpenAI API key not configured")
  }

  console.log("Starting AI analysis for text length:", text.length)

  try {
    // Dynamic import to avoid initialization issues
    const { default: OpenAI } = await import("openai")

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.chat.completions.create({
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
- confidence: score from 0-1 indicating confidence in the suggestion (optional)

Focus on:
1. Grammar errors (subject-verb agreement, tense consistency, etc.)
2. Spelling mistakes
3. Academic writing style improvements
4. Clarity and conciseness
5. Passive voice reduction where appropriate

Return only valid JSON array format. If no issues found, return empty array [].

Example format:
[
  {
    "startIndex": 0,
    "endIndex": 4,
    "type": "spelling",
    "originalText": "teh",
    "suggestedText": "the",
    "message": "Spelling error: 'teh' should be 'the'",
    "confidence": 0.95
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
    })

    console.log("OpenAI API response received")

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.log("No content in OpenAI response")
      return []
    }

    console.log("OpenAI response content:", content.substring(0, 200) + "...")

    try {
      // Clean the response in case it has markdown formatting
      const cleanContent = content
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim()

      const suggestions = JSON.parse(cleanContent)
      if (Array.isArray(suggestions)) {
        console.log("Successfully parsed AI suggestions:", suggestions.length)

        // Validate suggestion format
        const validSuggestions = suggestions.filter((suggestion) => {
          return (
            typeof suggestion.startIndex === "number" &&
            typeof suggestion.endIndex === "number" &&
            typeof suggestion.type === "string" &&
            typeof suggestion.originalText === "string" &&
            typeof suggestion.suggestedText === "string" &&
            typeof suggestion.message === "string"
          )
        })

        console.log("Valid suggestions after filtering:", validSuggestions.length)
        return validSuggestions
      } else {
        console.error("OpenAI response is not an array:", typeof suggestions)
        return []
      }
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError)
      console.error("Raw response:", content)
      return []
    }
  } catch (error: any) {
    console.error("OpenAI API error:", {
      message: error.message,
      type: error.type,
      code: error.code,
      status: error.status,
    })
    throw error
  }
}

export async function improveReadability(text: string): Promise<string> {
  if (!text.trim()) return text

  if (!process.env.OPENAI_API_KEY) {
    console.error("OpenAI API key not found for readability improvement")
    return text
  }

  try {
    const { default: OpenAI } = await import("openai")

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert academic writing coach. Improve the readability of the provided text while maintaining its academic tone and meaning. Focus on:

1. Simplifying complex sentences
2. Reducing passive voice where appropriate
3. Improving sentence flow and transitions
4. Maintaining academic rigor
5. Preserving the original meaning and key points

Return only the improved text, no explanations or additional commentary.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: Math.min(4000, text.length * 2),
    })

    return response.choices[0]?.message?.content || text
  } catch (error) {
    console.error("OpenAI readability improvement error:", error)
    return text
  }
}
