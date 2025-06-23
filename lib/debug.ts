export const DEBUG_ENABLED = process.env.DEBUG_LOGGING === "true" || process.env.NEXT_PUBLIC_DEBUG_LOGGING === "true"

/**
 * Log a debug message only when DEBUG_ENABLED is true.
 * Usage: debugLog("Some message", optionalData)
 */
export function debugLog(message: string, ...optionalParams: unknown[]): void {
  if (!DEBUG_ENABLED) return
  // Prefix with a common tag so logs can be filtered easily in the console provider (e.g. Vercel, Cloudflare, Browser)
  console.log(`[DEBUG] ${message}`, ...optionalParams)
}

/**
 * Measure the execution time of an async function when DEBUG_ENABLED is true.
 * It returns the wrapped function's result. When disabled, it just calls the fn.
 *
 * Example:
 *   const result = await debugTime("fetchDocuments", async () => supabase.from("documents").select())
 */
export async function debugTime<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (!DEBUG_ENABLED) {
    return fn()
  }

  const start = Date.now()
  try {
    return await fn()
  } finally {
    const duration = Date.now() - start
    console.log(`[DEBUG] ${label} took ${duration}ms`)
  }
}

/**
 * Returns a high-resolution timestamp when debugging is enabled.
 * Combine with endTimer to log custom segments.
 */
export function startTimer(): number {
  return DEBUG_ENABLED ? Date.now() : 0
}

/**
 * Ends a timer started with startTimer and logs the duration with the given label.
 */
export function endTimer(label: string, start: number): void {
  if (!DEBUG_ENABLED || start === 0) return
  console.log(`[DEBUG] ${label} took ${Date.now() - start}ms`)
} 