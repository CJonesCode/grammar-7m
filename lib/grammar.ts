/**
 * Grammar and style suggestion utilities
 * Provides mock suggestions when AI is not available
 */

export interface GrammarSuggestion {
  startIndex: number
  endIndex: number
  type: "grammar" | "spelling" | "style"
  originalText: string
  suggestedText: string
  message: string
}

/**
 * Common grammar patterns and their corrections
 */
const GRAMMAR_PATTERNS = [
  {
    pattern: /\bteh\b/gi,
    type: "spelling" as const,
    replacement: "the",
    message: 'Spelling error: "teh" should be "the"',
  },
  {
    pattern: /\brecieve\b/gi,
    type: "spelling" as const,
    replacement: "receive",
    message: 'Spelling error: "recieve" should be "receive"',
  },
  {
    pattern: /\boccured\b/gi,
    type: "spelling" as const,
    replacement: "occurred",
    message: 'Spelling error: "occured" should be "occurred"',
  },
  {
    pattern: /\bseperate\b/gi,
    type: "spelling" as const,
    replacement: "separate",
    message: 'Spelling error: "seperate" should be "separate"',
  },
  {
    pattern: /\bdefinately\b/gi,
    type: "spelling" as const,
    replacement: "definitely",
    message: 'Spelling error: "definately" should be "definitely"',
  },
  {
    pattern: /\bits\s+important\s+to\s+note\s+that\b/gi,
    type: "style" as const,
    replacement: "notably",
    message: 'Style: Consider using "notably" instead of "it\'s important to note that"',
  },
  {
    pattern: /\bin\s+order\s+to\b/gi,
    type: "style" as const,
    replacement: "to",
    message: 'Style: "In order to" can often be simplified to "to"',
  },
  {
    pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi,
    type: "style" as const,
    replacement: "because",
    message: 'Style: "Due to the fact that" can be simplified to "because"',
  },
  {
    pattern: /\bat\s+this\s+point\s+in\s+time\b/gi,
    type: "style" as const,
    replacement: "now",
    message: 'Style: "At this point in time" can be simplified to "now"',
  },
  {
    pattern: /\bfor\s+the\s+purpose\s+of\b/gi,
    type: "style" as const,
    replacement: "to",
    message: 'Style: "For the purpose of" can be simplified to "to"',
  },
  {
    pattern: /\b(a|an)\s+\1\b/gi,
    type: "grammar" as const,
    replacement: "$1",
    message: "Grammar: Duplicate article detected",
  },
  {
    pattern: /\bwould\s+of\b/gi,
    type: "grammar" as const,
    replacement: "would have",
    message: 'Grammar: "Would of" should be "would have"',
  },
  {
    pattern: /\bcould\s+of\b/gi,
    type: "grammar" as const,
    replacement: "could have",
    message: 'Grammar: "Could of" should be "could have"',
  },
  {
    pattern: /\bshould\s+of\b/gi,
    type: "grammar" as const,
    replacement: "should have",
    message: 'Grammar: "Should of" should be "should have"',
  },
]

/**
 * Check for passive voice patterns
 */
function findPassiveVoice(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = []
  const passivePattern = /\b(is|are|was|were|being|been)\s+\w+ed\b/gi
  let match

  while ((match = passivePattern.exec(text)) !== null) {
    // Skip if it's likely not passive voice (e.g., "is interested")
    const commonExceptions = ["interested", "concerned", "involved", "related", "based", "focused"]
    const word = match[0].split(" ").pop()?.toLowerCase()

    if (word && !commonExceptions.includes(word.replace("ed", ""))) {
      suggestions.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: "style",
        originalText: match[0],
        suggestedText: match[0], // Keep original for passive voice suggestions
        message: "Style: Consider using active voice for stronger, clearer writing",
      })
    }
  }

  return suggestions
}

/**
 * Check for overly long sentences
 */
function findLongSentences(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = []
  const sentences = text.split(/[.!?]+/)
  let currentIndex = 0

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (trimmedSentence.length === 0) {
      currentIndex += sentence.length + 1 // +1 for the delimiter
      continue
    }

    const wordCount = trimmedSentence.split(/\s+/).length

    if (wordCount > 25) {
      suggestions.push({
        startIndex: currentIndex,
        endIndex: currentIndex + sentence.length,
        type: "style",
        originalText: trimmedSentence,
        suggestedText: trimmedSentence,
        message: `Style: This sentence has ${wordCount} words. Consider breaking it into shorter sentences for better readability.`,
      })
    }

    currentIndex += sentence.length + 1 // +1 for the delimiter
  }

  return suggestions
}

/**
 * Check for repeated words
 */
function findRepeatedWords(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = []
  const repeatedPattern = /\b(\w+)\s+\1\b/gi
  let match

  while ((match = repeatedPattern.exec(text)) !== null) {
    // Skip common intentional repetitions
    const word = match[1].toLowerCase()
    const intentionalRepeats = ["very", "so", "really", "quite"]

    if (!intentionalRepeats.includes(word)) {
      suggestions.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: "grammar",
        originalText: match[0],
        suggestedText: match[1],
        message: `Grammar: Repeated word "${match[1]}" detected`,
      })
    }
  }

  return suggestions
}

/**
 * Generate mock grammar suggestions for text when AI is not available
 */
export function generateSuggestions(text: string): GrammarSuggestion[] {
  if (!text || text.trim().length === 0) {
    return []
  }

  const suggestions: GrammarSuggestion[] = []

  // Apply pattern-based suggestions
  for (const pattern of GRAMMAR_PATTERNS) {
    let match
    const regex = new RegExp(pattern.pattern.source, pattern.pattern.flags)

    while ((match = regex.exec(text)) !== null) {
      suggestions.push({
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        type: pattern.type,
        originalText: match[0],
        suggestedText: match[0].replace(pattern.pattern, pattern.replacement),
        message: pattern.message,
      })
    }
  }

  // Add passive voice suggestions
  suggestions.push(...findPassiveVoice(text))

  // Add long sentence suggestions
  suggestions.push(...findLongSentences(text))

  // Add repeated word suggestions
  suggestions.push(...findRepeatedWords(text))

  // Sort suggestions by position in text
  suggestions.sort((a, b) => a.startIndex - b.startIndex)

  // Remove overlapping suggestions (keep the first one)
  const filteredSuggestions: GrammarSuggestion[] = []
  let lastEndIndex = -1

  for (const suggestion of suggestions) {
    if (suggestion.startIndex >= lastEndIndex) {
      filteredSuggestions.push(suggestion)
      lastEndIndex = suggestion.endIndex
    }
  }

  return filteredSuggestions
}

/**
 * Get grammar statistics for text
 */
export function getGrammarStats(text: string) {
  const suggestions = generateSuggestions(text)

  const stats = {
    totalIssues: suggestions.length,
    grammarIssues: suggestions.filter((s) => s.type === "grammar").length,
    spellingIssues: suggestions.filter((s) => s.type === "spelling").length,
    styleIssues: suggestions.filter((s) => s.type === "style").length,
    wordCount: text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length,
    issueRate: 0,
  }

  if (stats.wordCount > 0) {
    stats.issueRate = Math.round((stats.totalIssues / stats.wordCount) * 100 * 10) / 10
  }

  return stats
}

/**
 * Apply a suggestion to text
 */
export function applySuggestion(text: string, suggestion: GrammarSuggestion): string {
  const before = text.substring(0, suggestion.startIndex)
  const after = text.substring(suggestion.endIndex)
  return before + suggestion.suggestedText + after
}

/**
 * Apply multiple suggestions to text (in reverse order to maintain indices)
 */
export function applySuggestions(text: string, suggestions: GrammarSuggestion[]): string {
  // Sort suggestions in reverse order by start index to maintain correct positions
  const sortedSuggestions = [...suggestions].sort((a, b) => b.startIndex - a.startIndex)

  let result = text
  for (const suggestion of sortedSuggestions) {
    result = applySuggestion(result, suggestion)
  }

  return result
}
