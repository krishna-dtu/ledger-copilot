/**
 * Tests for exception builders
 */

import { describe, it, expect } from 'vitest'
import {
  buildDuplicateException,
  buildMissingInBankException,
  buildMissingInLedgerException,
  buildAmountMismatchException,
  buildFeeMismatchException,
  buildTimingLagException,
} from '@/lib/reconciliation/exceptions'
import {
  DUPLICATE_INTERNAL_SET,
  DUPLICATE_BANK_SET,
  MISSING_IN_BANK_SET,
  MISSING_IN_LEDGER_SET,
  AMOUNT_MISMATCH_SET,
  AMOUNT_AND_FEE_MISMATCH_SET,
  FEE_MISMATCH_SET,
  TIMING_LAG_1DAY_SET,
  TIMING_LAG_2DAY_SET,
} from './fixtures'

describe('buildDuplicateException', () => {
  it('should create duplicate exception for internal source', () => {
    const ex = buildDuplicateException('TXN080', 2, 'internal')
    
    expect(ex.type).toBe('duplicate')
    expect(ex.internal_txn_id).toBe('TXN080')
    expect(ex.bank_txn_id).toBe(null)
    expect(ex.detail).toBe(DUPLICATE_INTERNAL_SET.expected_detail)
  })

  it('should create duplicate exception for bank source', () => {
    const ex = buildDuplicateException('TXN090', 2, 'bank')
    
    expect(ex.type).toBe('duplicate')
    expect(ex.internal_txn_id).toBe(null)
    expect(ex.bank_txn_id).toBe('TXN090')
    expect(ex.detail).toBe(DUPLICATE_BANK_SET.expected_detail)
  })
})

describe('buildMissingInBankException', () => {
  it('should create missing_in_bank exception', () => {
    const internal = MISSING_IN_BANK_SET.internal[0]
    const ex = buildMissingInBankException(internal)
    
    expect(ex.type).toBe('missing_in_bank')
    expect(ex.internal_txn_id).toBe('TXN030')
    expect(ex.bank_txn_id).toBe(null)
    expect(ex.detail).toBe(MISSING_IN_BANK_SET.expected_detail)
  })
})

describe('buildMissingInLedgerException', () => {
  it('should create missing_in_ledger exception', () => {
    const bank = MISSING_IN_LEDGER_SET.bank[0]
    const ex = buildMissingInLedgerException(bank)
    
    expect(ex.type).toBe('missing_in_ledger')
    expect(ex.internal_txn_id).toBe(null)
    expect(ex.bank_txn_id).toBe('TXN040')
    expect(ex.detail).toBe(MISSING_IN_LEDGER_SET.expected_detail)
  })
})

describe('buildAmountMismatchException', () => {
  it('should create amount_mismatch exception', () => {
    const internal = AMOUNT_MISMATCH_SET.internal[0]
    const bank = AMOUNT_MISMATCH_SET.bank[0]
    const ex = buildAmountMismatchException(internal, bank)
    
    expect(ex.type).toBe('amount_mismatch')
    expect(ex.internal_txn_id).toBe('TXN010')
    expect(ex.bank_txn_id).toBe('TXN010')
    expect(ex.detail).toBe(AMOUNT_MISMATCH_SET.expected_detail)
  })

  it('should mention fee difference when both amount and fee differ', () => {
    const internal = AMOUNT_AND_FEE_MISMATCH_SET.internal[0]
    const bank = AMOUNT_AND_FEE_MISMATCH_SET.bank[0]
    const ex = buildAmountMismatchException(internal, bank)
    
    expect(ex.type).toBe('amount_mismatch')
    
    // Check all expected strings are present
    const expectedParts = AMOUNT_AND_FEE_MISMATCH_SET.expected_detail_contains
    expectedParts.forEach(part => {
      expect(ex.detail).toContain(part)
    })
  })
})

describe('buildFeeMismatchException', () => {
  it('should create fee_mismatch exception', () => {
    const internal = FEE_MISMATCH_SET.internal[0]
    const bank = FEE_MISMATCH_SET.bank[0]
    const ex = buildFeeMismatchException(internal, bank)
    
    expect(ex.type).toBe('fee_mismatch')
    expect(ex.internal_txn_id).toBe('TXN020')
    expect(ex.bank_txn_id).toBe('TXN020')
    expect(ex.detail).toBe(FEE_MISMATCH_SET.expected_detail)
  })
})

describe('buildTimingLagException', () => {
  it('should create timing_lag exception for 1-day lag', () => {
    const internal = TIMING_LAG_1DAY_SET.internal[0]
    const bank = TIMING_LAG_1DAY_SET.bank[0]
    const ex = buildTimingLagException(internal, bank)
    
    expect(ex.type).toBe('timing_lag')
    expect(ex.internal_txn_id).toBe('TXN050')
    expect(ex.bank_txn_id).toBe('TXN051')
    expect(ex.detail).toBe(TIMING_LAG_1DAY_SET.expected_detail)
  })

  it('should create timing_lag exception for 2-day lag', () => {
    const internal = TIMING_LAG_2DAY_SET.internal[0]
    const bank = TIMING_LAG_2DAY_SET.bank[0]
    const ex = buildTimingLagException(internal, bank)
    
    expect(ex.type).toBe('timing_lag')
    expect(ex.internal_txn_id).toBe('TXN060')
    expect(ex.bank_txn_id).toBe('TXN061')
    expect(ex.detail).toBe(TIMING_LAG_2DAY_SET.expected_detail)
  })
})
