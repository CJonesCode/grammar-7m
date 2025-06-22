import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely rounds a number, handling null/undefined/NaN values
 * @param value The number to round
 * @returns The rounded number, or 0 if the input is invalid
 */
export function safeRound(value: number | null | undefined) {
  return Number.isFinite(value as number) ? Math.round(value as number) : 0
}
