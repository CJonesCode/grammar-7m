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
      // Note: Harper.js automatically includes academic writing rules
      harperInstance = new LocalLinter({ binary })
      
      console.log("✅ Harper initialized successfully with academic writing support")
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
    
    // Use Harper to check the text (includes academic writing rules by default)
    const results = await harper.lint(text)
    
    // Convert Harper results to our GrammarSuggestion format
    const suggestions: GrammarSuggestion[] = results.map((result: any, index: number) => {
      // Get the span using the correct API
      const span = result.span()
      
      // Access span properties correctly - they are properties, not methods
      const start = span.start
      const end = span.end
      
      // Get message and suggestions using correct API
      const message = result.message()
      const suggestions = result.suggestions()
      
      // Ensure we have valid text data
      const originalText = text.slice(start, end) || ""
      
      // Map Harper suggestion types to our types
      let suggestionType: "grammar" | "spelling" | "style" = "grammar"
      
      // Determine suggestion type based on the message
      const messageStr = String(message)
      const messageLower = messageStr.toLowerCase()
      if (messageLower.includes("spell") || messageLower.includes("misspelled")) {
        suggestionType = "spelling"
      } else if (messageLower.includes("style") || messageLower.includes("wordy") || messageLower.includes("redundant")) {
        suggestionType = "style"
      }
      
      // Get the suggested text from the first suggestion using correct API
      let suggestedText = ""
      if (suggestions.length > 0) {
        const allSuggestions: string[] = []
        
        // Check all suggestions to find the best one
        for (let i = 0; i < suggestions.length; i++) {
          const suggestion = suggestions[i]
          const prototype = Object.getPrototypeOf(suggestion)
          if (prototype && typeof prototype.get_replacement_text === 'function') {
            try {
              const replacementText = prototype.get_replacement_text.call(suggestion)
              allSuggestions.push(replacementText)
            } catch (error: any) {
              // Continue to next suggestion if this one fails
            }
          }
        }
        
        // Pick the best suggestion based on common sense and context
        if (allSuggestions.length > 0) {
          // Priority list for common corrections with context awareness
          const priorityWords = ['The', 'the', 'This', 'this', 'That', 'that', 'They', 'they', 'There', 'there', 'Their', 'their']
          
          // Get context around the error
          const contextBefore = text.slice(Math.max(0, start - 20), start).toLowerCase()
          const contextAfter = text.slice(end, Math.min(text.length, end + 20)).toLowerCase()
          const isStartOfSentence = start === 0 || /[.!?]\s*$/.test(text.slice(0, start))
          
          // Special handling for common misspellings
          if (originalText.toLowerCase() === 'teh') {
            if (isStartOfSentence) {
              suggestedText = 'The'
            } else {
              suggestedText = 'the'
            }
          } else if (originalText.toLowerCase() === 'its' && !originalText.includes("'")) {
            // Check if it should be "it's" or "its"
            const nextWord = contextAfter.split(/\s+/)[0]
            if (nextWord && ['is', 'was', 'will', 'would', 'could', 'should'].includes(nextWord)) {
              suggestedText = "it's"
            } else {
              suggestedText = "its"
            }
          } else if (originalText.toLowerCase() === 'your' && contextAfter.includes('going')) {
            suggestedText = "you're"
          } else if (originalText.toLowerCase() === 'their' && contextAfter.includes('are')) {
            suggestedText = "there"
          } else if (originalText.toLowerCase() === 'there' && contextAfter.includes('new')) {
            suggestedText = "their"
          } else {
            // Try to find a priority word in Harper's suggestions
            const priorityMatch = allSuggestions.find(suggestion => 
              priorityWords.includes(suggestion)
            )
            
            if (priorityMatch) {
              suggestedText = priorityMatch
            } else {
              // Fall back to the first suggestion
              suggestedText = allSuggestions[0]
            }
          }
        }
      }
      
      const suggestion = {
        id: `harper-${index}-${Date.now()}`,
        startIndex: start,
        endIndex: end,
        type: suggestionType,
        originalText: originalText,
        suggestedText: suggestedText,
        message: messageStr,
      }
      
      return suggestion
    }).filter(suggestion => {
      // Filter out invalid suggestions
      const isValid = suggestion.originalText.length > 0 && 
        suggestion.startIndex >= 0 && 
        suggestion.endIndex > suggestion.startIndex
      
      return isValid
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