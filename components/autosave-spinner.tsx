"use client"

import { useEffect, useState, useRef } from "react"

interface AutosaveSpinnerProps {
  isActive: boolean
  duration: number // in milliseconds
  onComplete?: () => void
  size?: number // diameter in px, default 12
}

export function AutosaveSpinner({
  isActive,
  duration,
  onComplete,
  size = 12,
}: AutosaveSpinnerProps) {
  const [progress, setProgress] = useState(100) // 100 -> 0, % remaining
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [showSaved, setShowSaved] = useState(false)
  const [showSavingText, setShowSavingText] = useState(false)

  const onCompleteRef = useRef(onComplete)

  // Keep latest onComplete in ref without triggering the main effect
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Debug logging to detect unexpected state resets or reloads
  useEffect(() => {
    console.info("🌀 AutosaveSpinner mounted – initialised", { isActive, duration })
    return () => console.info("🌀 AutosaveSpinner unmounted")
  }, [])

  useEffect(() => {
    if (!isActive) {
      setProgress(100)
      setShowSavingText(false)
      return
    }

    setShowSaved(false)
    setSavedAt(null)
    setShowSavingText(false)

    const startTime = Date.now()
    console.info("🌀 Autosave cycle started at", new Date(startTime).toLocaleTimeString())

    const animationDelay = duration * 0.25
    const animationDuration = duration * 0.75

    let frameId: number
    const tick = () => {
      const elapsed = Date.now() - startTime

      if (elapsed < animationDelay) {
        setProgress(100)
        setShowSavingText(false)
      } else {
        const animationElapsed = elapsed - animationDelay
        const percentRemaining = Math.max(0, 100 - (animationElapsed / animationDuration) * 100)
        setProgress(percentRemaining)
        setShowSavingText(true)
      }

      if (elapsed >= duration) {
        setProgress(100)
        setShowSavingText(false)
        setSavedAt(new Date())
        setShowSaved(true)
        console.info("✅ Autosave complete at", new Date().toLocaleTimeString())
        onCompleteRef.current?.()
      } else {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(frameId)
  }, [isActive, duration])

  // Show saved state (persistent until next autosave starts)
  if (showSaved && savedAt) {
    return (
      <div className="flex items-center text-xs text-green-700 font-medium w-28">
        <div className="w-3 h-3 bg-green-500 rounded-full mr-2 flex-shrink-0" />
        <span className="truncate">Saved {savedAt.toLocaleTimeString()}</span>
        <span className="sr-only" role="status" aria-live="polite">
          Saved at {savedAt.toLocaleTimeString()}
        </span>
      </div>
    )
  }

  // Show autosave progress (only when active)
  if (isActive) {
    return (
      <div className="flex items-center text-xs text-gray-700 w-28">
        <div
          className="relative mr-2 flex-shrink-0 rounded-full transform -scale-x-100"
          style={{
            width: size,
            height: size,
            background: `conic-gradient(#3b82f6 ${progress}%, #e5e7eb ${progress}%)`,
          }}
          role="presentation"
        />
        <span className={`transition-opacity duration-300 ${showSavingText ? "opacity-100" : "opacity-0 invisible"}`}>
          Saving...
        </span>
        <span className="sr-only" role="status" aria-live="polite">
          Saving in progress
        </span>
      </div>
    )
  }

  // Don't show anything if not active and no saved state
  return null
}
