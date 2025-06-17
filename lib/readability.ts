// Simple readability scoring implementation
export interface ReadabilityScore {
  fleschReadingEase: number
  fleschKincaidGrade: number
  averageWordsPerSentence: number
  averageSyllablesPerWord: number
  wordCount: number
  sentenceCount: number
}

function countSyllables(word: string): number {
  word = word.toLowerCase()
  if (word.length <= 3) return 1

  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
  word = word.replace(/^y/, "")
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

export function calculateReadability(text: string): ReadabilityScore {
  if (!text.trim()) {
    return {
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      averageWordsPerSentence: 0,
      averageSyllablesPerWord: 0,
      wordCount: 0,
      sentenceCount: 0,
    }
  }

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.split(/\s+/).filter((w) => w.trim().length > 0)

  const sentenceCount = sentences.length
  const wordCount = words.length
  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0)

  const averageWordsPerSentence = wordCount / sentenceCount
  const averageSyllablesPerWord = syllableCount / wordCount

  // Flesch Reading Ease Score
  const fleschReadingEase = 206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade = 0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59

  return {
    fleschReadingEase: Math.max(0, Math.min(100, fleschReadingEase)),
    fleschKincaidGrade: Math.max(0, fleschKincaidGrade),
    averageWordsPerSentence,
    averageSyllablesPerWord,
    wordCount,
    sentenceCount,
  }
}

export function getReadabilityLevel(score: number): string {
  if (score >= 90) return "Very Easy"
  if (score >= 80) return "Easy"
  if (score >= 70) return "Fairly Easy"
  if (score >= 60) return "Standard"
  if (score >= 50) return "Fairly Difficult"
  if (score >= 30) return "Difficult"
  return "Very Difficult"
}
