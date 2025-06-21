import didYouMean from "didyoumean"
import wordList from "an-array-of-english-words"

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

// Build a Set for O(1) look-ups.  This is done once per session and cached in the module scope.
const dictionary = new Set<string>(wordList as string[])

// Utility to test if a token is a valid word (consists of letters / apostrophes only)
const WORD_REGEX = /[a-zA-Z']+/g

// Generates spelling suggestions for a single misspelled word
function createSpellingSuggestion(word: string): string | null {
  didYouMean.threshold = 0.4
  didYouMean.caseSensitive = false
  didYouMean.returnFirstMatch = true
  const suggestion = didYouMean(word.toLowerCase(), wordList as string[])
  if (!suggestion) return null
  return suggestion.toLowerCase() === word.toLowerCase() ? null : suggestion
}

export function generateSuggestions(text: string): GrammarSuggestion[] {
  const suggestions: GrammarSuggestion[] = []

  // 1. Static grammar/style rules (existing)
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

  // 2. Spell-checking similar to Chrome spellchecker
  let match: RegExpExecArray | null
  while ((match = WORD_REGEX.exec(text)) !== null) {
    const original = match[0]
    if (original.length < 3) continue

    const suggestionWord = createSpellingSuggestion(original)

    if (suggestionWord) {
      suggestions.push({
        id: `spelling-${match.index}-${Date.now()}`,
        startIndex: match.index,
        endIndex: match.index + original.length,
        type: "spelling",
        originalText: original,
        suggestedText: suggestionWord,
        message: `Spelling: "${original}" → "${suggestionWord}"`,
      })
    }
  }

  // Ensure deterministic ordering
  return suggestions.sort((a, b) => a.startIndex - b.startIndex)
}
