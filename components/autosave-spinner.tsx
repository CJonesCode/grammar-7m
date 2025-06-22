"use client"

import { useEffect, useState } from "react"

interface AutosaveSpinnerProps {
  isActive: boolean
  duration: number // in milliseconds
  onComplete?: () => void
}

export function AutosaveSpinner({ isActive, duration, onComplete }: AutosaveSpinnerProps) {
  const [progress, setProgress] = useState(0) // 0-100, represents how much is depleted
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [showSavingText, setShowSavingText] = useState(false)

  useEffect(() => {
    if (!isActive) {
      // Don't reset saved state when not active - keep it persistent
      setProgress(0)
      setShowSavingText(false)
      return
    }

    // When starting a new autosave cycle, hide the saved state
    setShowSaved(false)
    setSavedAt(null)
    setShowSavingText(false)

    const startTime = Date.now()
    const interval = 16 // ~60fps for smooth animation
    const animationDelay = duration * 0.25 // Wait until 25% of total duration
    const animationDuration = duration * 0.75 // Animation runs for the last 75%

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime

      if (elapsed < animationDelay) {
        // Keep progress at 0 (full circle) for the first 25%
        setProgress(0)
        setShowSavingText(false)
      } else {
        // Start animation after delay, animate over the remaining 75%
        const animationElapsed = elapsed - animationDelay
        const newProgress = Math.min((animationElapsed / animationDuration) * 100, 100)
        setProgress(newProgress)
        setShowSavingText(true)
      }

      if (elapsed >= duration) {
        clearInterval(timer)
        setProgress(0)
        setShowSavingText(false)
        setSavedAt(new Date())
        setShowSaved(true)
        onComplete?.()
      }
    }, interval)

    return () => clearInterval(timer)
  }, [isActive, duration, onComplete])

  // Show saved state (persistent until next autosave starts)
  if (showSaved && savedAt) {
    return (
      <div className="flex items-center text-sm text-green-600 font-medium">
        <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
        <span>Saved at {savedAt.toLocaleTimeString()}</span>
      </div>
    )
  }

  // Show autosave progress (only when active)
  if (isActive) {
    return (
      <div className="flex items-center text-sm text-gray-700">
        <div className="relative w-3 h-3 mr-2">
          {/* Background circle */}
          <div className="absolute inset-0 bg-gray-200 rounded-full" />
          {/* Progress circle - blue decreases clockwise */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-75 ease-linear"
            style={{
              background: `conic-gradient(from 0deg, transparent 0%, transparent ${progress}%, #3b82f6 ${progress}%, #3b82f6 100%)`,
              filter: "blur(0.5px)", // Smooth edges
            }}
          />
        </div>
        {showSavingText && <span>Saving...</span>}
      </div>
    )
  }

  // Don't show anything if not active and no saved state
  return null
}
