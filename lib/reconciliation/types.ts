/**
 * Core types for the reconciliation engine
 */

export type TransactionSource = 'internal' | 'bank'

export interface Transaction {
  txn_id: string
  amount: number        // in INR, can be negative/zero
  fee: number           // in INR, typically positive
  date: string          // ISO 8601 date (YYYY-MM-DD)
  merchant_id: string
  source?: TransactionSource  // added by engine for tracking
}

export type ExceptionType = 
  | 'missing_in_ledger' 
  | 'missing_in_bank' 
  | 'amount_mismatch' 
  | 'fee_mismatch' 
  | 'duplicate' 
  | 'timing_lag'

export interface Exception {
  type: ExceptionType
  internal_txn_id: string | null
  bank_txn_id: string | null
  detail: string
}

export interface ReconciliationResult {
  total_records: number      // internal.length + bank.length (includes duplicates)
  matched_count: number
  match_rate: number         // matched_count / total_records, rounded to 4 decimals
  exceptions: Exception[]
}

// Matching pass results
export interface ExactMatchResult {
  matched: number
  exceptions: Exception[]
  unmatched_internal: Transaction[]
  unmatched_bank: Transaction[]
}

export interface FuzzyMatchResult {
  exceptions: Exception[]
  unmatched_internal: Transaction[]
  unmatched_bank: Transaction[]
}

export interface DuplicateDetectionResult {
  exceptions: Exception[]
  deduplicated: Transaction[]
}
