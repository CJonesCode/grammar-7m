import { LocalLinter, binary } from "harper.js"

export interface GrammarSuggestion {
  id: string
  startIndex: number
  endIndex: number
  type: "grammar" | "spelling" | "style"
  originalText: string
  suggestedText: string
  message: string
}

// Initialize Harper instance (client-side only)
let harperInstance: LocalLinter | null = null

async function getHarperInstance(): Promise<LocalLinter> {
  if (!harperInstance) {
    try {
      // Initialize Harper with the binary module (client-side only)
      harperInstance = new LocalLinter({ binary })
      
      console.log("✅ Harper initialized successfully (client-side)")
    } catch (error) {
      console.error("❌ Failed to initialize Harper:", error)
      throw new Error("Failed to initialize grammar checker")
    }
  }
  
  return harperInstance
}

export async function checkTextWithHarper(text: string): Promise<GrammarSuggestion[]> {
  if (!text.trim()) {
    return []
  }

  try {
    const harper = await getHarperInstance()
    
    console.log("🔍 Harper checking text:", text)
    console.log("🔍 Text length:", text.length)
    
    // Use Harper to check the text
    const results = await harper.lint(text)
    
    console.log("📊 Harper raw results:", results)
    console.log("📊 Number of results:", results.length)
    
    // Convert Harper results to our GrammarSuggestion format
    const suggestions: GrammarSuggestion[] = results.map((result: any, index: number) => {
      console.log(`🔍 Processing result ${index}:`, result)
      
      // Use the correct Harper API methods
      const span = result.span()
      console.log(`🔍 Span object:`, span)
      console.log(`🔍 Span type:`, typeof span)
      console.log(`🔍 Span keys:`, Object.keys(span))
      console.log(`🔍 Span methods:`, Object.getOwnPropertyNames(span))
      
      // Try different approaches to get start/end
      let start = 0
      let end = 0
      
      if (typeof span.start === 'function') {
        start = span.start()
      } else if (span.start !== undefined) {
        start = span.start
      } else if (typeof span.get_start === 'function') {
        start = span.get_start()
      } else if (span.get_start !== undefined) {
        start = span.get_start
      }
      
      if (typeof span.end === 'function') {
        end = span.end()
      } else if (span.end !== undefined) {
        end = span.end
      } else if (typeof span.get_end === 'function') {
        end = span.get_end()
      } else if (span.get_end !== undefined) {
        end = span.get_end
      }
      
      const message = result.message()
      const suggestions = result.suggestions()
      
      console.log(`🔍 Result ${index} details:`, { start, end, message, suggestions })
      console.log(`🔍 Original text at position: "${text.slice(start, end)}"`)
      console.log(`🔍 Context around position: "${text.slice(Math.max(0, start-10), end+10)}"`)
      
      // Map Harper suggestion types to our types
      let suggestionType: "grammar" | "spelling" | "style" = "grammar"
      
      // Determine suggestion type based on the message - only convert to lowercase for comparison
      const messageStr = String(message)
      const messageLower = messageStr.toLowerCase()
      if (messageLower.includes("spell") || messageLower.includes("misspelled")) {
        suggestionType = "spelling"
      } else if (messageLower.includes("style") || messageLower.includes("wordy") || messageLower.includes("redundant")) {
        suggestionType = "style"
      }
      
      // Get the suggested text from the first suggestion
      let suggestedText = ""
      if (suggestions.length > 0) {
        const firstSuggestion = suggestions[0]
        console.log(`🔍 First suggestion:`, firstSuggestion)
        console.log(`🔍 Suggestion keys:`, Object.keys(firstSuggestion))
        
        if (typeof firstSuggestion.get_replacement_text === 'function') {
          suggestedText = firstSuggestion.get_replacement_text()
        } else if (firstSuggestion.get_replacement_text !== undefined) {
          suggestedText = firstSuggestion.get_replacement_text
        } else if (typeof firstSuggestion.text === 'function') {
          suggestedText = firstSuggestion.text()
        } else if (firstSuggestion.text !== undefined) {
          suggestedText = firstSuggestion.text
        }
      }
      
      // Ensure we have valid text data
      const originalText = text.slice(start, end) || ""
      
      const suggestion = {
        id: `harper-${index}-${Date.now()}`,
        startIndex: start,
        endIndex: end,
        type: suggestionType,
        originalText: originalText,
        suggestedText: suggestedText,
        message: messageStr, // Preserve original message casing
      }
      
      console.log(`✅ Created suggestion ${index}:`, suggestion)
      return suggestion
    }).filter(suggestion => {
      // Filter out invalid suggestions
      const isValid = suggestion.originalText.length > 0 && 
        suggestion.startIndex >= 0 && 
        suggestion.endIndex > suggestion.startIndex
      
      if (!isValid) {
        console.log(`❌ Filtered out invalid suggestion:`, suggestion)
      }
      
      return isValid
    })
    
    console.log("🎯 Final suggestions:", suggestions)
    console.log("🎯 Summary - Found", suggestions.length, "issues in text of length", text.length)
    
    // Log what we expected vs what we got
    const expectedIssues = [
      "Your going", "Its a", "students was", "there new", "Between you and I", 
      "their are", "students have", "there work"
    ]
    
    console.log("🎯 Expected issues to find:")
    expectedIssues.forEach(issue => {
      const found = suggestions.some(s => s.originalText.includes(issue.split(' ')[0]))
      console.log(`  ${found ? '✅' : '❌'} ${issue}`)
    })
    
    return suggestions
  } catch (error) {
    console.error("❌ Harper check failed:", error)
    // Return empty array on error to avoid breaking the UI
    return []
  }
}

// Export a simple function to check if Harper is ready
export async function isHarperReady(): Promise<boolean> {
  try {
    await getHarperInstance()
    return true
  } catch {
    return false
  }
} 