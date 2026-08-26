/**
 * Test: Verify match_rate uses consistent units (records, not pairs)
 */

import { describe, it, expect } from 'vitest'
import { reconcile } from '@/lib/reconciliation'

describe('Match Rate Units Consistency', () => {
  it('should compute match_rate as matched_records / total_records', () => {
    // Simple dataset with no duplicates: 3 perfect matches
    const internal = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      { txn_id: 'TXN003', amount: 3000, fee: 60, date: '2026-08-03', merchant_id: 'M003' },
    ]
    
    const bank = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      { txn_id: 'TXN003', amount: 3000, fee: 60, date: '2026-08-03', merchant_id: 'M003' },
    ]
    
    const result = reconcile(internal, bank)
    
    // Verify counts
    expect(result.total_records).toBe(6)  // 3 internal + 3 bank
    expect(result.matched_count).toBe(6)  // all 6 records matched (3 pairs × 2)
    expect(result.exceptions).toHaveLength(0)
    
    // Verify match_rate is 1.0 (100%)
    expect(result.match_rate).toBe(1.0)
    
    // Verify the formula: matched_count / total_records
    const computed_match_rate = result.matched_count / result.total_records
    expect(result.match_rate).toBe(computed_match_rate)
  })
  
  it('should handle partial matches correctly', () => {
    // 2 perfect matches + 1 missing in bank + 1 missing in ledger
    const internal = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      { txn_id: 'TXN003', amount: 3000, fee: 60, date: '2026-08-03', merchant_id: 'M003' }, // no bank match
    ]
    
    const bank = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      { txn_id: 'TXN004', amount: 4000, fee: 80, date: '2026-08-04', merchant_id: 'M004' }, // no internal match
    ]
    
    const result = reconcile(internal, bank)
    
    // Verify counts
    expect(result.total_records).toBe(6)  // 3 internal + 3 bank
    expect(result.matched_count).toBe(4)  // 2 pairs matched = 4 records
    expect(result.exceptions).toHaveLength(2)  // 1 missing_in_bank + 1 missing_in_ledger
    
    // Verify match_rate: 4/6 = 0.6667
    expect(result.match_rate).toBeCloseTo(0.6667, 4)
    
    // Verify the formula
    const computed_match_rate = parseFloat((result.matched_count / result.total_records).toFixed(4))
    expect(result.match_rate).toBe(computed_match_rate)
  })
  
  it('should handle exceptions that pair records (amount_mismatch)', () => {
    // 1 perfect match + 1 amount mismatch (still pairs 2 records, but doesn't count as matched)
    const internal = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
    ]
    
    const bank = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 1980, fee: 40, date: '2026-08-02', merchant_id: 'M002' }, // amount mismatch
    ]
    
    const result = reconcile(internal, bank)
    
    // Verify counts
    expect(result.total_records).toBe(4)  // 2 internal + 2 bank
    expect(result.matched_count).toBe(2)  // only 1 pair matched = 2 records
    expect(result.exceptions).toHaveLength(1)  // 1 amount_mismatch
    
    // Verify match_rate: 2/4 = 0.5
    expect(result.match_rate).toBe(0.5)
    
    // Verify the formula
    const computed_match_rate = result.matched_count / result.total_records
    expect(result.match_rate).toBe(computed_match_rate)
  })
  
  it('should handle duplicates correctly in match_rate', () => {
    // 1 perfect match + 1 duplicate in internal (2 internal records, 1 bank record)
    const internal = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' }, // duplicate
    ]
    
    const bank = [
      { txn_id: 'TXN001', amount: 1000, fee: 20, date: '2026-08-01', merchant_id: 'M001' },
      { txn_id: 'TXN002', amount: 2000, fee: 40, date: '2026-08-02', merchant_id: 'M002' },
    ]
    
    const result = reconcile(internal, bank)
    
    // Verify counts
    expect(result.total_records).toBe(5)  // 3 internal + 2 bank
    expect(result.matched_count).toBe(4)  // 2 pairs matched = 4 records
    expect(result.exceptions).toHaveLength(1)  // 1 duplicate
    
    // Verify match_rate: 4/5 = 0.8
    expect(result.match_rate).toBe(0.8)
    
    // Verify the formula
    const computed_match_rate = result.matched_count / result.total_records
    expect(result.match_rate).toBe(computed_match_rate)
  })
})
