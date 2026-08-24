/**
 * Utility functions for reconciliation engine
 */

/**
 * Format a number as Indian Rupees with Indian digit grouping
 * Example: 450000 → "₹4,50,000"
 * Example: 4500.50 → "₹4,500.50"
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calculate the absolute difference in days between two dates
 */
export function dateDiffDays(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Check if bank date is later than or equal to internal date
 * Settlement never precedes ledger recognition
 */
export function isBankDateLaterOrEqual(internalDate: string, bankDate: string): boolean {
  return new Date(bankDate) >= new Date(internalDate)
}

/**
 * Get the absolute difference between two amounts
 */
export function amountDiff(amount1: number, amount2: number): number {
  return Math.abs(amount1 - amount2)
}
