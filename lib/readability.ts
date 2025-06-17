/**
 * Readability calculation utilities
 * Implements Flesch Reading Ease and Flesch-Kincaid Grade Level
 */

interface ReadabilityScore {
  fleschReadingEase: number
  fleschKincaidGrade: number
  averageWordsPerSentence: number
  averageSyllablesPerWord: number
  wordCount: number
  sentenceCount: number
  syllableCount: number
  readabilityLevel: string
}

/**
 * Count syllables in a word using a simple heuristic
 */
function countSyllables(word: string): number {
  if (!word || word.length === 0) return 0

  word = word.toLowerCase()

  // Remove punctuation and numbers
  word = word.replace(/[^a-z]/g, "")

  if (word.length === 0) return 0
  if (word.length <= 3) return 1

  // Count vowel groups
  let syllables = 0
  let previousWasVowel = false
  const vowels = "aeiouy"

  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i])

    if (isVowel && !previousWasVowel) {
      syllables++
    }

    previousWasVowel = isVowel
  }

  // Handle silent 'e' at the end
  if (word.endsWith("e") && syllables > 1) {
    syllables--
  }

  // Every word has at least one syllable
  return Math.max(1, syllables)
}

/**
 * Count sentences in text
 */
function countSentences(text: string): number {
  if (!text || text.trim().length === 0) return 0

  // Split by sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter((sentence) => sentence.trim().length > 0)

  return Math.max(1, sentences.length)
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0

  // Split by whitespace and filter out empty strings
  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && /[a-zA-Z]/.test(word))

  return words.length
}

/**
 * Count total syllables in text
 */
function countTotalSyllables(text: string): number {
  if (!text || text.trim().length === 0) return 0

  const words = text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0 && /[a-zA-Z]/.test(word))

  return words.reduce((total, word) => total + countSyllables(word), 0)
}

/**
 * Determine readability level based on Flesch Reading Ease score
 */
function getReadabilityLevel(fleschScore: number): string {
  if (fleschScore >= 90) return "Very Easy"
  if (fleschScore >= 80) return "Easy"
  if (fleschScore >= 70) return "Fairly Easy"
  if (fleschScore >= 60) return "Standard"
  if (fleschScore >= 50) return "Fairly Difficult"
  if (fleschScore >= 30) return "Difficult"
  return "Very Difficult"
}

/**
 * Calculate comprehensive readability metrics for given text
 */
export function calculateReadability(text: string): ReadabilityScore {
  if (!text || text.trim().length === 0) {
    return {
      fleschReadingEase: 0,
      fleschKincaidGrade: 0,
      averageWordsPerSentence: 0,
      averageSyllablesPerWord: 0,
      wordCount: 0,
      sentenceCount: 0,
      syllableCount: 0,
      readabilityLevel: "No Content",
    }
  }

  const wordCount = countWords(text)
  const sentenceCount = countSentences(text)
  const syllableCount = countTotalSyllables(text)

  // Avoid division by zero
  const averageWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0
  const averageSyllablesPerWord = wordCount > 0 ? syllableCount / wordCount : 0

  // Flesch Reading Ease Score
  // Formula: 206.835 - (1.015 × ASL) - (84.6 × ASW)
  // ASL = Average Sentence Length (words per sentence)
  // ASW = Average Syllables per Word
  const fleschReadingEase = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * averageWordsPerSentence - 84.6 * averageSyllablesPerWord),
  )

  // Flesch-Kincaid Grade Level
  // Formula: (0.39 × ASL) + (11.8 × ASW) - 15.59
  const fleschKincaidGrade = Math.max(0, 0.39 * averageWordsPerSentence + 11.8 * averageSyllablesPerWord - 15.59)

  const readabilityLevel = getReadabilityLevel(fleschReadingEase)

  return {
    fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    averageWordsPerSentence: Math.round(averageWordsPerSentence * 10) / 10,
    averageSyllablesPerWord: Math.round(averageSyllablesPerWord * 100) / 100,
    wordCount,
    sentenceCount,
    syllableCount,
    readabilityLevel,
  }
}

/**
 * Get readability recommendations based on score
 */
export function getReadabilityRecommendations(score: ReadabilityScore): string[] {
  const recommendations: string[] = []

  if (score.fleschReadingEase < 60) {
    recommendations.push("Consider using shorter sentences to improve readability")
  }

  if (score.averageWordsPerSentence > 20) {
    recommendations.push("Try to keep sentences under 20 words for better clarity")
  }

  if (score.averageSyllablesPerWord > 1.7) {
    recommendations.push("Consider using simpler words with fewer syllables")
  }

  if (score.fleschKincaidGrade > 12) {
    recommendations.push("The text may be too complex for general audiences")
  }

  if (score.wordCount < 100) {
    recommendations.push("Consider adding more content for a more comprehensive analysis")
  }

  if (recommendations.length === 0) {
    recommendations.push("Your text has good readability for academic writing")
  }

  return recommendations
}
