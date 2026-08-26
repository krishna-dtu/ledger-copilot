/**
 * Test fixtures for reconciliation engine
 * Hand-crafted data sets for each exception type
 */

import { Transaction, ReconciliationResult } from '@/lib/reconciliation/types'

// Helper to create transactions
function tx(
  txn_id: string,
  amount: number,
  fee: number,
  date: string,
  merchant_id = 'M001',
  source: 'internal' | 'bank' = 'internal'
): Transaction {
  return { txn_id, amount, fee, date, merchant_id, source }
}

// 1. Perfect matches - 100% match rate
export const PERFECT_MATCH_SET = {
  internal: [
    tx('TXN001', 1000.00, 20.00, '2026-08-01', 'M001', 'internal'),
    tx('TXN002', 2500.50, 50.00, '2026-08-02', 'M002', 'internal'),
    tx('TXN003', 500.00, 10.00, '2026-08-03', 'M003', 'internal'),
  ],
  bank: [
    tx('TXN001', 1000.00, 20.00, '2026-08-01', 'M001', 'bank'),
    tx('TXN002', 2500.50, 50.00, '2026-08-02', 'M002', 'bank'),
    tx('TXN003', 500.00, 10.00, '2026-08-03', 'M003', 'bank'),
  ],
  expected: {
    total_records: 6,
    matched_count: 6,  // 3 pairs × 2 = 6 records
    match_rate: 1.0,   // 6/6 = 1.0 (100%)
    exception_count: 0,
  }
}

// 2. Amount mismatch
export const AMOUNT_MISMATCH_SET = {
  internal: [
    tx('TXN010', 4500.00, 90.00, '2026-08-10', 'M010', 'internal'),
  ],
  bank: [
    tx('TXN010', 4487.50, 90.00, '2026-08-10', 'M010', 'bank'),
  ],
  expected_detail: 'Ledger shows ₹4,500.00, bank shows ₹4,487.50 — difference of ₹12.50',
}

// 3. Amount mismatch with fee also different (should mention both)
export const AMOUNT_AND_FEE_MISMATCH_SET = {
  internal: [
    tx('TXN011', 5000.00, 100.00, '2026-08-11', 'M011', 'internal'),
  ],
  bank: [
    tx('TXN011', 4950.00, 99.00, '2026-08-11', 'M011', 'bank'),
  ],
  expected_detail_contains: ['₹5,000.00', '₹4,950.00', '₹50.00', 'fee differs by ₹1.00'],
}

// 4. Fee mismatch (amounts match, fees differ)
export const FEE_MISMATCH_SET = {
  internal: [
    tx('TXN020', 3000.00, 60.00, '2026-08-15', 'M020', 'internal'),
  ],
  bank: [
    tx('TXN020', 3000.00, 45.00, '2026-08-15', 'M020', 'bank'),
  ],
  expected_detail: 'Ledger fee ₹60.00, bank fee ₹45.00 — fee miscalculated by ₹15.00',
}

// 5. Missing in bank
export const MISSING_IN_BANK_SET = {
  internal: [
    tx('TXN030', 1500.00, 30.00, '2026-08-20', 'M030', 'internal'),
  ],
  bank: [],
  expected_detail: 'Ledger transaction TXN030 for ₹1,500.00 has no corresponding bank settlement',
}

// 6. Missing in ledger
export const MISSING_IN_LEDGER_SET = {
  internal: [],
  bank: [
    tx('TXN040', 2000.00, 40.00, '2026-08-22', 'M040', 'bank'),
  ],
  expected_detail: 'Bank transaction TXN040 for ₹2,000.00 has no corresponding ledger entry',
}

// 7. Timing lag (fuzzy match with 1-day lag)
export const TIMING_LAG_1DAY_SET = {
  internal: [
    tx('TXN050', 1800.00, 36.00, '2026-08-24', 'M050', 'internal'),
  ],
  bank: [
    tx('TXN051', 1800.00, 36.00, '2026-08-25', 'M051', 'bank'),  // different txn_id, 1 day later
  ],
  expected_detail: 'Ledger entry on 2026-08-24, bank settled on 2026-08-25 — 1-day settlement lag',
}

// 8. Timing lag (fuzzy match with 2-day lag)
export const TIMING_LAG_2DAY_SET = {
  internal: [
    tx('TXN060', 2200.00, 44.00, '2026-08-10', 'M060', 'internal'),
  ],
  bank: [
    tx('TXN061', 2200.00, 44.00, '2026-08-12', 'M061', 'bank'),  // 2 days later
  ],
  expected_detail: 'Ledger entry on 2026-08-10, bank settled on 2026-08-12 — 2-day settlement lag',
}

// 9. Same-day different txn_id - should NOT fuzzy match (Edge Case 4)
export const SAME_DAY_DIFFERENT_ID_SET = {
  internal: [
    tx('TXN070', 3000.00, 60.00, '2026-08-15', 'M070', 'internal'),
  ],
  bank: [
    tx('TXN071', 3000.00, 60.00, '2026-08-15', 'M071', 'bank'),  // same day, different ID
  ],
  expected: {
    // Should create 2 missing exceptions, NOT a timing_lag
    exception_types: ['missing_in_bank', 'missing_in_ledger'],
  }
}

// 10. Duplicate in internal ledger
export const DUPLICATE_INTERNAL_SET = {
  internal: [
    tx('TXN080', 1000.00, 20.00, '2026-08-18', 'M080', 'internal'),
    tx('TXN080', 1000.00, 20.00, '2026-08-18', 'M080', 'internal'),  // duplicate
  ],
  bank: [
    tx('TXN080', 1000.00, 20.00, '2026-08-18', 'M080', 'bank'),
  ],
  expected_detail: 'Transaction TXN080 appears 2 times in internal',
}

// 11. Duplicate in bank
export const DUPLICATE_BANK_SET = {
  internal: [
    tx('TXN090', 1200.00, 24.00, '2026-08-19', 'M090', 'internal'),
  ],
  bank: [
    tx('TXN090', 1200.00, 24.00, '2026-08-19', 'M090', 'bank'),
    tx('TXN090', 1200.00, 24.00, '2026-08-19', 'M090', 'bank'),  // duplicate
  ],
  expected_detail: 'Transaction TXN090 appears 2 times in bank',
}

// 12. Edge case: Zero amounts
export const ZERO_AMOUNT_SET = {
  internal: [
    tx('TXN100', 0.00, 0.00, '2026-08-20', 'M100', 'internal'),
  ],
  bank: [
    tx('TXN100', 0.00, 0.00, '2026-08-20', 'M100', 'bank'),
  ],
  expected: {
    matched_count: 2,  // 1 pair × 2 = 2 records
  }
}

// 13. Edge case: Negative amounts (chargebacks)
export const NEGATIVE_AMOUNT_SET = {
  internal: [
    tx('TXN110', -500.00, 0.00, '2026-08-21', 'M110', 'internal'),
  ],
  bank: [
    tx('TXN110', -500.00, 0.00, '2026-08-21', 'M110', 'bank'),
  ],
  expected: {
    matched_count: 2,  // 1 pair × 2 = 2 records
  }
}

// 14. Fuzzy match with amount within tolerance (₹0.50 difference)
export const FUZZY_AMOUNT_TOLERANCE_SET = {
  internal: [
    tx('TXN120', 1000.00, 20.00, '2026-08-22', 'M120', 'internal'),
  ],
  bank: [
    tx('TXN121', 1000.50, 20.00, '2026-08-23', 'M121', 'bank'),  // ₹0.50 diff, 1 day later
  ],
  expected: {
    exception_type: 'timing_lag',
  }
}

// 15. Fuzzy match should reject: amount difference > ₹1
export const FUZZY_REJECT_AMOUNT_SET = {
  internal: [
    tx('TXN130', 1000.00, 20.00, '2026-08-24', 'M130', 'internal'),
  ],
  bank: [
    tx('TXN131', 1001.50, 20.00, '2026-08-25', 'M131', 'bank'),  // ₹1.50 diff - exceeds tolerance
  ],
  expected: {
    exception_types: ['missing_in_bank', 'missing_in_ledger'],  // both should be missing
  }
}

// 16. Fuzzy match should reject: date difference > 2 days
export const FUZZY_REJECT_DATE_SET = {
  internal: [
    tx('TXN140', 2000.00, 40.00, '2026-08-10', 'M140', 'internal'),
  ],
  bank: [
    tx('TXN141', 2000.00, 40.00, '2026-08-14', 'M141', 'bank'),  // 4 days later - exceeds tolerance
  ],
  expected: {
    exception_types: ['missing_in_bank', 'missing_in_ledger'],
  }
}

// 17. Fuzzy match should reject: bank date < internal date
export const FUZZY_REJECT_BANK_EARLIER_SET = {
  internal: [
    tx('TXN150', 3000.00, 60.00, '2026-08-25', 'M150', 'internal'),
  ],
  bank: [
    tx('TXN151', 3000.00, 60.00, '2026-08-24', 'M151', 'bank'),  // bank is EARLIER - invalid
  ],
  expected: {
    exception_types: ['missing_in_bank', 'missing_in_ledger'],
  }
}

// 18. Complex scenario: all exception types
export const ALL_EXCEPTIONS_SET = {
  internal: [
    tx('TXN201', 1000.00, 20.00, '2026-08-01', 'M201', 'internal'), // perfect match
    tx('TXN202', 1000.00, 20.00, '2026-08-02', 'M202', 'internal'), // duplicate internal
    tx('TXN202', 1000.00, 20.00, '2026-08-02', 'M202', 'internal'), // duplicate internal
    tx('TXN203', 2000.00, 40.00, '2026-08-03', 'M203', 'internal'), // amount mismatch
    tx('TXN204', 3000.00, 60.00, '2026-08-04', 'M204', 'internal'), // fee mismatch
    tx('TXN205', 4000.00, 80.00, '2026-08-05', 'M205', 'internal'), // missing in bank
    tx('TXN207', 5000.00, 100.00, '2026-08-07', 'M207', 'internal'), // timing lag
  ],
  bank: [
    tx('TXN201', 1000.00, 20.00, '2026-08-01', 'M201', 'bank'), // perfect match
    tx('TXN203', 1980.00, 40.00, '2026-08-03', 'M203', 'bank'), // amount mismatch
    tx('TXN204', 3000.00, 55.00, '2026-08-04', 'M204', 'bank'), // fee mismatch
    tx('TXN206', 4500.00, 90.00, '2026-08-06', 'M206', 'bank'), // missing in ledger
    tx('TXN208', 5000.00, 100.00, '2026-08-08', 'M208', 'bank'), // timing lag (1 day later)
    tx('TXN209', 6000.00, 120.00, '2026-08-09', 'M209', 'bank'), // duplicate bank
    tx('TXN209', 6000.00, 120.00, '2026-08-09', 'M209', 'bank'), // duplicate bank
  ],
  expected: {
    total_records: 14,  // 7 internal + 7 bank
    matched_count: 2,   // only TXN201 (1 pair × 2 = 2 records)
    exception_types: ['duplicate', 'duplicate', 'amount_mismatch', 'fee_mismatch', 'missing_in_bank', 'missing_in_ledger', 'timing_lag'],
  }
}
