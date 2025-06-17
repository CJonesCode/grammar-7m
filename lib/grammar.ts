export interface GrammarSuggestion {
  id: string
  startIndex: number
  endIndex: number
  type: "grammar" | "spelling" | "style"
  originalText: string
  suggestedText: string
  message: string
}

// Mock grammar rules for demonstration
const grammarRules = [
  {
    pattern: /\bteh\b/gi,
    type: "spelling" as const,
    replacement: "the",
    message: 'Spelling error: "teh" should be "the"',
  },
  {
    pattern: /\byour\s+welcome\b/gi,
    type: "grammar" as const,
    replacement: "you're welcome",
    message: 'Grammar: Use "you\'re" (you are) instead of "your"',
  },
  {
    pattern: /\bits\s+a\s+good\s+idea\b/gi,
    type: "style" as const,
    replacement: "it's an excellent idea",
    message: "Style: Consider using more precise language",
  },
  {
    pattern: /\bvery\s+good\b/gi,
    type: "style" as const,
    replacement: "excellent",
    message: 'Style: "Excellent" is more precise than "very good"',
  },
  {
    pattern: /\ba\s+lot\s+of\b/gi,
    type: "style" as const,
    replacement: "many",
    message: 'Style: "Many" is more formal than "a lot of"',
  },
]

export function generateSuggestions(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = []

  grammarRules.forEach((rule) => {
    let match
    while ((match = rule.pattern.exec(text)) !== null) {
      suggestions.push({
        id: `${rule.type}-${match.index}-${Date.now()}`,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: rule.type,
        originalText: match[0],
        suggestedText: rule.replacement,
        message: rule.message,
      })
    }
  })

  return suggestions.sort((a, b) => a.startIndex - b.startIndex)
}
