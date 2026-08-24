/**
 * Integration tests for the complete reconciliation engine
 */

import { describe, it, expect } from 'vitest'
import { reconcile } from '@/lib/reconciliation/engine'
import {
  PERFECT_MATCH_SET,
  AMOUNT_MISMATCH_SET,
  FEE_MISMATCH_SET,
  MISSING_IN_BANK_SET,
  MISSING_IN_LEDGER_SET,
  TIMING_LAG_1DAY_SET,
  DUPLICATE_INTERNAL_SET,
  DUPLICATE_BANK_SET,
  SAME_DAY_DIFFERENT_ID_SET,
  ZERO_AMOUNT_SET,
  NEGATIVE_AMOUNT_SET,
  ALL_EXCEPTIONS_SET,
} from './fixtures'

describe('reconcile - integration tests', () => {
  describe('validation', () => {
    it('should throw error for missing txn_id', () => {
      const invalid = [{ txn_id: '', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' }]
      expect(() => reconcile(invalid, [])).toThrow('txn_id is required')
    })

    it('should throw error for invalid amount', () => {
      const invalid = [{ txn_id: 'TXN001', amount: NaN, fee: 20, date: '2026-08-01', merchant_id: 'M001' }]
      expect(() => reconcile(invalid, [])).toThrow('amount must be a finite number')
    })

    it('should throw error for invalid fee', () => {
      const invalid = [{ txn_id: 'TXN001', amount: 1000, fee: Infinity, date: '2026-08-01', merchant_id: 'M001' }]
      expect(() => reconcile(invalid, [])).toThrow('fee must be a finite number')
    })

    it('should throw error for invalid date', () => {
      const invalid = [{ txn_id: 'TXN001', amount: 1000, fee: 20, date: 'not-a-date', merchant_id: 'M001' }]
      expect(() => reconcile(invalid, [])).toThrow('date must be a valid ISO date string')
    })
  })

  describe('happy path', () => {
    it('should achieve 50% match rate for perfect matches', () => {
      const result = reconcile(PERFECT_MATCH_SET.internal, PERFECT_MATCH_SET.bank)
      
      expect(result.total_records).toBe(PERFECT_MATCH_SET.expected.total_records)
      expect(result.matched_count).toBe(PERFECT_MATCH_SET.expected.matched_count)
      expect(result.match_rate).toBe(PERFECT_MATCH_SET.expected.match_rate)
      expect(result.exceptions).toHaveLength(PERFECT_MATCH_SET.expected.exception_count)
    })

    it('should handle empty inputs', () => {
      const result = reconcile([], [])
      
      expect(result.total_records).toBe(0)
      expect(result.matched_count).toBe(0)
      expect(result.match_rate).toBe(0)
      expect(result.exceptions).toHaveLength(0)
    })
  })

  describe('single exception types', () => {
    it('should detect amount mismatch', () => {
      const result = reconcile(AMOUNT_MISMATCH_SET.internal, AMOUNT_MISMATCH_SET.bank)
      
      expect(result.exceptions).toHaveLength(1)
      expect(result.exceptions[0].type).toBe('amount_mismatch')
      expect(result.matched_count).toBe(0)
    })

    it('should detect fee mismatch', () => {
      const result = reconcile(FEE_MISMATCH_SET.internal, FEE_MISMATCH_SET.bank)
      
      expect(result.exceptions).toHaveLength(1)
      expect(result.exceptions[0].type).toBe('fee_mismatch')
      expect(result.matched_count).toBe(0)
    })

    it('should detect missing in bank', () => {
      const result = reconcile(MISSING_IN_BANK_SET.internal, MISSING_IN_BANK_SET.bank)
      
      expect(result.exceptions).toHaveLength(1)
      expect(result.exceptions[0].type).toBe('missing_in_bank')
      expect(result.matched_count).toBe(0)
    })

    it('should detect missing in ledger', () => {
      const result = reconcile(MISSING_IN_LEDGER_SET.internal, MISSING_IN_LEDGER_SET.bank)
      
      expect(result.exceptions).toHaveLength(1)
      expect(result.exceptions[0].type).toBe('missing_in_ledger')
      expect(result.matched_count).toBe(0)
    })

    it('should detect timing lag', () => {
      const result = reconcile(TIMING_LAG_1DAY_SET.internal, TIMING_LAG_1DAY_SET.bank)
      
      expect(result.exceptions).toHaveLength(1)
      expect(result.exceptions[0].type).toBe('timing_lag')
      expect(result.matched_count).toBe(0)  // timing_lag is not counted as a match
    })

    it('should detect duplicate in internal', () => {
      const result = reconcile(DUPLICATE_INTERNAL_SET.internal, DUPLICATE_INTERNAL_SET.bank)
      
      const duplicateExceptions = result.exceptions.filter(e => e.type === 'duplicate')
      expect(duplicateExceptions).toHaveLength(1)
      expect(duplicateExceptions[0].internal_txn_id).toBe('TXN080')
    })

    it('should detect duplicate in bank', () => {
      const result = reconcile(DUPLICATE_BANK_SET.internal, DUPLICATE_BANK_SET.bank)
      
      const duplicateExceptions = result.exceptions.filter(e => e.type === 'duplicate')
      expect(duplicateExceptions).toHaveLength(1)
      expect(duplicateExceptions[0].bank_txn_id).toBe('TXN090')
    })
  })

  describe('edge cases', () => {
    it('should NOT fuzzy match same-day transactions with different IDs', () => {
      const result = reconcile(SAME_DAY_DIFFERENT_ID_SET.internal, SAME_DAY_DIFFERENT_ID_SET.bank)
      
      // Should create 2 missing exceptions, NOT a timing_lag
      const timingLagExceptions = result.exceptions.filter(e => e.type === 'timing_lag')
      expect(timingLagExceptions).toHaveLength(0)
      
      const missingExceptions = result.exceptions.filter(e => 
        e.type === 'missing_in_bank' || e.type === 'missing_in_ledger'
      )
      expect(missingExceptions).toHaveLength(2)
    })

    it('should handle zero amounts', () => {
      const result = reconcile(ZERO_AMOUNT_SET.internal, ZERO_AMOUNT_SET.bank)
      
      expect(result.matched_count).toBe(ZERO_AMOUNT_SET.expected.matched_count)
      expect(result.exceptions).toHaveLength(0)
    })

    it('should handle negative amounts', () => {
      const result = reconcile(NEGATIVE_AMOUNT_SET.internal, NEGATIVE_AMOUNT_SET.bank)
      
      expect(result.matched_count).toBe(NEGATIVE_AMOUNT_SET.expected.matched_count)
      expect(result.exceptions).toHaveLength(0)
    })
  })

  describe('complex scenarios', () => {
    it('should handle all exception types in one batch', () => {
      const result = reconcile(ALL_EXCEPTIONS_SET.internal, ALL_EXCEPTIONS_SET.bank)
      
      expect(result.total_records).toBe(ALL_EXCEPTIONS_SET.expected.total_records)
      expect(result.matched_count).toBe(ALL_EXCEPTIONS_SET.expected.matched_count)
      
      // Check all expected exception types are present
      const exceptionTypes = result.exceptions.map(e => e.type)
      ALL_EXCEPTIONS_SET.expected.exception_types.forEach(expectedType => {
        expect(exceptionTypes).toContain(expectedType)
      })
    })

    it('should calculate match rate correctly for complex batch', () => {
      const result = reconcile(ALL_EXCEPTIONS_SET.internal, ALL_EXCEPTIONS_SET.bank)
      
      // 1 match out of 14 total records = 0.0714 (rounded to 4 decimals)
      expect(result.match_rate).toBeCloseTo(1 / 14, 4)
    })
  })

  describe('match rate precision', () => {
    it('should round match rate to 4 decimal places', () => {
      // Create a scenario with 1 match out of 3 records = 0.33333...
      const internal = [{ txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' }]
      const bank = [
        { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
        { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      ]
      
      const result = reconcile(internal, bank)
      
      expect(result.total_records).toBe(3)
      expect(result.matched_count).toBe(1)
      expect(result.match_rate).toBe(0.3333)  // 1/3 = 0.3333 (4 decimals)
    })
  })

  describe('total_records calculation', () => {
    it('should include duplicates in total_records count', () => {
      // 2 internal (1 duplicate) + 1 bank = 3 total
      const result = reconcile(DUPLICATE_INTERNAL_SET.internal, DUPLICATE_INTERNAL_SET.bank)
      
      expect(result.total_records).toBe(3)  // includes the duplicate
    })

    it('should count all records from both sources', () => {
      const internal = [
        { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
        { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      ]
      const bank = [
        { txn_id: 'TXN003', amount: 3000, fee: 60, date: '2026-08-03', merchant_id: 'M003' },
      ]
      
      const result = reconcile(internal, bank)
      
      expect(result.total_records).toBe(3)  // 2 + 1
    })
  })
})
