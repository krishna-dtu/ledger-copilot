/**
 * Tests for reconciliation utility functions
 */

import { describe, it, expect } from 'vitest'
import { formatINR, dateDiffDays, isBankDateLaterOrEqual, amountDiff } from '@/lib/reconciliation/utils'

describe('formatINR', () => {
  it('should format with Indian digit grouping', () => {
    expect(formatINR(450000)).toBe('₹4,50,000.00')
    expect(formatINR(4500)).toBe('₹4,500.00')
    expect(formatINR(1000000)).toBe('₹10,00,000.00')
  })

  it('should format decimals correctly', () => {
    expect(formatINR(4500.50)).toBe('₹4,500.50')
    expect(formatINR(1234.56)).toBe('₹1,234.56')
  })

  it('should handle zero and negative amounts', () => {
    expect(formatINR(0)).toBe('₹0.00')
    expect(formatINR(-500)).toBe('-₹500.00')
  })

  it('should always show 2 decimal places', () => {
    expect(formatINR(1000)).toBe('₹1,000.00')
    expect(formatINR(1000.5)).toBe('₹1,000.50')
  })
})

describe('dateDiffDays', () => {
  it('should calculate difference between dates', () => {
    expect(dateDiffDays('2026-08-24', '2026-08-24')).toBe(0)
    expect(dateDiffDays('2026-08-24', '2026-08-25')).toBe(1)
    expect(dateDiffDays('2026-08-24', '2026-08-26')).toBe(2)
    expect(dateDiffDays('2026-08-10', '2026-08-15')).toBe(5)
  })

  it('should return absolute difference (order does not matter)', () => {
    expect(dateDiffDays('2026-08-25', '2026-08-24')).toBe(1)
    expect(dateDiffDays('2026-08-26', '2026-08-24')).toBe(2)
  })
})

describe('isBankDateLaterOrEqual', () => {
  it('should return true when bank date is later', () => {
    expect(isBankDateLaterOrEqual('2026-08-24', '2026-08-25')).toBe(true)
    expect(isBankDateLaterOrEqual('2026-08-24', '2026-08-26')).toBe(true)
  })

  it('should return true when dates are equal', () => {
    expect(isBankDateLaterOrEqual('2026-08-24', '2026-08-24')).toBe(true)
  })

  it('should return false when bank date is earlier', () => {
    expect(isBankDateLaterOrEqual('2026-08-25', '2026-08-24')).toBe(false)
    expect(isBankDateLaterOrEqual('2026-08-26', '2026-08-24')).toBe(false)
  })
})

describe('amountDiff', () => {
  it('should calculate absolute difference', () => {
    expect(amountDiff(1000, 1000)).toBe(0)
    expect(amountDiff(1000, 1010)).toBe(10)
    expect(amountDiff(1010, 1000)).toBe(10)
  })

  it('should handle decimals', () => {
    expect(amountDiff(1000.50, 1000.00)).toBe(0.50)
    expect(amountDiff(4500.00, 4487.50)).toBe(12.50)
  })

  it('should handle negative amounts', () => {
    expect(amountDiff(-500, -500)).toBe(0)
    expect(amountDiff(-500, -510)).toBe(10)
    expect(amountDiff(500, -500)).toBe(1000)
  })
})
