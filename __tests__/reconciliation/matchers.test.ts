/**
 * Tests for matching logic (Pass 1: exact, Pass 2: fuzzy)
 */

import { describe, it, expect } from 'vitest'
import { detectDuplicates, exactMatch, fuzzyMatch } from '@/lib/reconciliation/matchers'
import {
  PERFECT_MATCH_SET,
  AMOUNT_MISMATCH_SET,
  FEE_MISMATCH_SET,
  DUPLICATE_INTERNAL_SET,
  DUPLICATE_BANK_SET,
  TIMING_LAG_1DAY_SET,
  TIMING_LAG_2DAY_SET,
  SAME_DAY_DIFFERENT_ID_SET,
  FUZZY_AMOUNT_TOLERANCE_SET,
  FUZZY_REJECT_AMOUNT_SET,
  FUZZY_REJECT_DATE_SET,
  FUZZY_REJECT_BANK_EARLIER_SET,
  ZERO_AMOUNT_SET,
  NEGATIVE_AMOUNT_SET,
} from './fixtures'

describe('detectDuplicates', () => {
  it('should detect duplicates in internal transactions', () => {
    const result = detectDuplicates(DUPLICATE_INTERNAL_SET.internal, DUPLICATE_INTERNAL_SET.bank)
    
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('duplicate')
    expect(result.exceptions[0].detail).toBe(DUPLICATE_INTERNAL_SET.expected_detail)
    
    // Should keep only first occurrence in deduplicated array
    const internalDedup = result.deduplicated.filter(t => t.source === 'internal')
    expect(internalDedup).toHaveLength(1)
  })

  it('should detect duplicates in bank transactions', () => {
    const result = detectDuplicates(DUPLICATE_BANK_SET.internal, DUPLICATE_BANK_SET.bank)
    
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('duplicate')
    expect(result.exceptions[0].detail).toBe(DUPLICATE_BANK_SET.expected_detail)
    
    // Should keep only first occurrence
    const bankDedup = result.deduplicated.filter(t => t.source === 'bank')
    expect(bankDedup).toHaveLength(1)
  })

  it('should return no exceptions when no duplicates exist', () => {
    const result = detectDuplicates(PERFECT_MATCH_SET.internal, PERFECT_MATCH_SET.bank)
    
    expect(result.exceptions).toHaveLength(0)
    expect(result.deduplicated).toHaveLength(6)  // 3 internal + 3 bank
  })
})

describe('exactMatch', () => {
  it('should match perfectly matching transactions', () => {
    const result = exactMatch(PERFECT_MATCH_SET.internal, PERFECT_MATCH_SET.bank)
    
    expect(result.matched).toBe(3)
    expect(result.exceptions).toHaveLength(0)
    expect(result.unmatched_internal).toHaveLength(0)
    expect(result.unmatched_bank).toHaveLength(0)
  })

  it('should detect amount mismatch', () => {
    const result = exactMatch(AMOUNT_MISMATCH_SET.internal, AMOUNT_MISMATCH_SET.bank)
    
    expect(result.matched).toBe(0)
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('amount_mismatch')
    expect(result.exceptions[0].detail).toBe(AMOUNT_MISMATCH_SET.expected_detail)
    expect(result.unmatched_internal).toHaveLength(0)  // matched but with exception
    expect(result.unmatched_bank).toHaveLength(0)
  })

  it('should detect fee mismatch', () => {
    const result = exactMatch(FEE_MISMATCH_SET.internal, FEE_MISMATCH_SET.bank)
    
    expect(result.matched).toBe(0)
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('fee_mismatch')
    expect(result.exceptions[0].detail).toBe(FEE_MISMATCH_SET.expected_detail)
    expect(result.unmatched_internal).toHaveLength(0)
    expect(result.unmatched_bank).toHaveLength(0)
  })

  it('should handle zero amounts', () => {
    const result = exactMatch(ZERO_AMOUNT_SET.internal, ZERO_AMOUNT_SET.bank)
    
    expect(result.matched).toBe(1)
    expect(result.exceptions).toHaveLength(0)
  })

  it('should handle negative amounts', () => {
    const result = exactMatch(NEGATIVE_AMOUNT_SET.internal, NEGATIVE_AMOUNT_SET.bank)
    
    expect(result.matched).toBe(1)
    expect(result.exceptions).toHaveLength(0)
  })

  it('should leave unmatched transactions for Pass 2', () => {
    const internal = [{ txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001', source: 'internal' as const }]
    const bank = [{ txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002', source: 'bank' as const }]
    
    const result = exactMatch(internal, bank)
    
    expect(result.matched).toBe(0)
    expect(result.exceptions).toHaveLength(0)
    expect(result.unmatched_internal).toHaveLength(1)
    expect(result.unmatched_bank).toHaveLength(1)
  })
})

describe('fuzzyMatch', () => {
  it('should match transactions with 1-day timing lag', () => {
    const result = fuzzyMatch(TIMING_LAG_1DAY_SET.internal, TIMING_LAG_1DAY_SET.bank)
    
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('timing_lag')
    expect(result.exceptions[0].detail).toBe(TIMING_LAG_1DAY_SET.expected_detail)
    expect(result.unmatched_internal).toHaveLength(0)
    expect(result.unmatched_bank).toHaveLength(0)
  })

  it('should match transactions with 2-day timing lag', () => {
    const result = fuzzyMatch(TIMING_LAG_2DAY_SET.internal, TIMING_LAG_2DAY_SET.bank)
    
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('timing_lag')
    expect(result.exceptions[0].detail).toBe(TIMING_LAG_2DAY_SET.expected_detail)
    expect(result.unmatched_internal).toHaveLength(0)
    expect(result.unmatched_bank).toHaveLength(0)
  })

  it('should NOT match same-day transactions with different IDs (Edge Case 4)', () => {
    const result = fuzzyMatch(SAME_DAY_DIFFERENT_ID_SET.internal, SAME_DAY_DIFFERENT_ID_SET.bank)
    
    expect(result.exceptions).toHaveLength(0)  // no timing_lag
    expect(result.unmatched_internal).toHaveLength(1)  // both remain unmatched
    expect(result.unmatched_bank).toHaveLength(1)
  })

  it('should match transactions with amount within tolerance', () => {
    const result = fuzzyMatch(FUZZY_AMOUNT_TOLERANCE_SET.internal, FUZZY_AMOUNT_TOLERANCE_SET.bank)
    
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('timing_lag')
  })

  it('should reject fuzzy match when amount exceeds tolerance', () => {
    const result = fuzzyMatch(FUZZY_REJECT_AMOUNT_SET.internal, FUZZY_REJECT_AMOUNT_SET.bank)
    
    expect(result.exceptions).toHaveLength(0)
    expect(result.unmatched_internal).toHaveLength(1)
    expect(result.unmatched_bank).toHaveLength(1)
  })

  it('should reject fuzzy match when date exceeds tolerance', () => {
    const result = fuzzyMatch(FUZZY_REJECT_DATE_SET.internal, FUZZY_REJECT_DATE_SET.bank)
    
    expect(result.exceptions).toHaveLength(0)
    expect(result.unmatched_internal).toHaveLength(1)
    expect(result.unmatched_bank).toHaveLength(1)
  })

  it('should reject fuzzy match when bank date is earlier than internal', () => {
    const result = fuzzyMatch(FUZZY_REJECT_BANK_EARLIER_SET.internal, FUZZY_REJECT_BANK_EARLIER_SET.bank)
    
    expect(result.exceptions).toHaveLength(0)
    expect(result.unmatched_internal).toHaveLength(1)
    expect(result.unmatched_bank).toHaveLength(1)
  })

  it('should pick closest date match when multiple candidates exist', () => {
    const internal = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-24', merchant_id: 'M001', source: 'internal' as const }
    ]
    const bank = [
      { txn_id: 'TXN002', amount: 1000, fee: 20, date: '2026-08-26', merchant_id: 'M002', source: 'bank' as const },  // 2 days
      { txn_id: 'TXN003', amount: 1000, fee: 20, date: '2026-08-25', merchant_id: 'M003', source: 'bank' as const },  // 1 day (closer)
    ]
    
    const result = fuzzyMatch(internal, bank)
    
    expect(result.exceptions).toHaveLength(1)
    expect(result.exceptions[0].type).toBe('timing_lag')
    expect(result.exceptions[0].bank_txn_id).toBe('TXN003')  // should pick the 1-day match
    expect(result.unmatched_bank).toHaveLength(1)  // TXN002 remains unmatched
  })
})
