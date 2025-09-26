import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { VisibilityState } from "@tanstack/react-table"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Column visibility preferences utilities
const COLUMN_VISIBILITY_KEY = 'table-column-visibility'

export function saveColumnVisibility(visibility: VisibilityState): void {
  try {
    localStorage.setItem(COLUMN_VISIBILITY_KEY, JSON.stringify(visibility))
  } catch (error) {
    console.warn('Failed to save column visibility preferences:', error)
  }
}

export function loadColumnVisibility(): VisibilityState {
  try {
    const saved = localStorage.getItem(COLUMN_VISIBILITY_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (error) {
    console.warn('Failed to load column visibility preferences:', error)
    return {}
  }
}

export function clearColumnVisibility(): void {
  try {
    localStorage.removeItem(COLUMN_VISIBILITY_KEY)
  } catch (error) {
    console.warn('Failed to clear column visibility preferences:', error)
  }
}
