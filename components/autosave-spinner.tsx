"use client"

import { useEffect, useState, useRef } from "react"

interface AutosaveSpinnerProps {
  isActive: boolean
  duration: number // in milliseconds
  onComplete?: () => void
  size?: number // diameter in px, default 12
  stroke?: number // stroke width in px, default 2
  colorClass?: string // Tailwind stroke color class, default "stroke-blue-500"
}

export function AutosaveSpinner({
  isActive,
  duration,
  onComplete,
  size = 12,
  stroke = 2,
  colorClass = "stroke-blue-500",
}: AutosaveSpinnerProps) {
  const [progress, setProgress] = useState(1) // 1 -> 0 represents remaining fraction
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
      // Don't reset saved state when not active - keep it persistent
      setProgress(1)
      setShowSavingText(false)
      return
    }

    // When starting a new autosave cycle, hide the saved state
    setShowSaved(false)
    setSavedAt(null)
    setShowSavingText(false)

    const startTime = Date.now()
    console.info("🌀 Autosave cycle started at", new Date(startTime).toLocaleTimeString())

    const animationDelay = duration * 0.25 // Wait until 25% of total duration
    const animationDuration = duration * 0.75 // Animate over last 75%

    let frameId: number
    const tick = () => {
      const elapsed = Date.now() - startTime

      if (elapsed < animationDelay) {
        setProgress(1)
        setShowSavingText(false)
      } else {
        const animationElapsed = elapsed - animationDelay
        const fractionRemaining = Math.max(
          0,
          1 - animationElapsed / animationDuration
        )
        setProgress(fractionRemaining)
        setShowSavingText(true)
      }

      if (elapsed >= duration) {
        setProgress(1)
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
    const radius = (size - stroke) / 2
    const circumference = 2 * Math.PI * radius

    return (
      <div className="flex items-center text-xs text-gray-700 w-28">
        <svg
          width={size}
          height={size}
          className="rotate-[-90deg] mr-2 flex-shrink-0"
          role="presentation"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="stroke-gray-200"
            fill="transparent"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className={colorClass}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.1s linear" }}
          />
        </svg>
        {/* Invisible placeholder keeps width steady */}
        <span
          className={`transition-opacity duration-300 ${
            showSavingText ? "opacity-100" : "opacity-0 invisible"
          }`}
        >
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
