"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GrammarSuggestion } from "@/lib/grammar"

// Badge variants for different suggestion types
const suggestionBadgeVariants = {
  grammar: "destructive",
  spelling: "default",
  style: "secondary",
} as const

interface SuggestionItemProps {
  suggestion: GrammarSuggestion
  onApply: (suggestion: GrammarSuggestion) => void
  onDismiss: (suggestionId: string) => void
}

export function SuggestionItem({ suggestion, onApply, onDismiss }: SuggestionItemProps) {
  return (
    <li className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant={suggestionBadgeVariants[suggestion.type as keyof typeof suggestionBadgeVariants] || "secondary"}>
          {suggestion.type}
        </Badge>
      </div>
      <p className="text-sm text-gray-700">{suggestion.message}</p>
      <div className="space-y-1">
        <div className="text-xs text-gray-700">
          Original: <span className="font-mono bg-red-50 px-1 rounded">{suggestion.originalText}</span>
        </div>
        <div className="text-xs text-gray-700">
          Suggested:{" "}
          <span className="font-mono bg-green-50 px-1 rounded">{suggestion.suggestedText}</span>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button size="sm" onClick={() => onApply(suggestion)} className="text-xs">
          Apply
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDismiss(suggestion.id)}
          className="text-xs"
        >
          Dismiss
        </Button>
      </div>
    </li>
  )
} 