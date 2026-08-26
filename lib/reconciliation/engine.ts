/**
 * Main reconciliation engine
 * Orchestrates duplicate detection, exact matching, fuzzy matching, and exception classification
 */

import { Transaction, ReconciliationResult } from './types'
import { detectDuplicates, exactMatch, fuzzyMatch } from './matchers'
import { buildMissingInBankException, buildMissingInLedgerException } from './exceptions'
import { MATCH_RATE_PRECISION } from './constants'

/**
 * Validate transaction data before processing
 */
function validateTransactions(txns: Transaction[]): void {
  for (const txn of txns) {
    if (!txn.txn_id || txn.txn_id.trim() === '') {
      throw new Error(`Invalid transaction: txn_id is required`)
    }
    if (typeof txn.amount !== 'number' || !isFinite(txn.amount)) {
      throw new Error(`Invalid transaction ${txn.txn_id}: amount must be a finite number`)
    }
    if (typeof txn.fee !== 'number' || !isFinite(txn.fee)) {
      throw new Error(`Invalid transaction ${txn.txn_id}: fee must be a finite number`)
    }
    if (!txn.date || isNaN(Date.parse(txn.date))) {
      throw new Error(`Invalid transaction ${txn.txn_id}: date must be a valid ISO date string`)
    }
  }
}

/**
 * Main reconciliation function
 * Takes internal ledger and bank statement transactions, returns reconciliation result
 */
export function reconcile(
  internalTransactions: Transaction[],
  bankTransactions: Transaction[]
): ReconciliationResult {
  // Tag transactions with their source
  const internal = internalTransactions.map(txn => ({ ...txn, source: 'internal' as const }))
  const bank = bankTransactions.map(txn => ({ ...txn, source: 'bank' as const }))
  
  // Validate input
  validateTransactions(internal)
  validateTransactions(bank)
  
  // Calculate total records (includes duplicates per requirement)
  const total_records = internal.length + bank.length
  
  // Step 1: Detect duplicates
  const duplicateResult = detectDuplicates(internal, bank)
  const allExceptions = [...duplicateResult.exceptions]
  
  // Get deduplicated transactions for matching
  const dedupInternal = duplicateResult.deduplicated.filter(t => t.source === 'internal')
  const dedupBank = duplicateResult.deduplicated.filter(t => t.source === 'bank')
  
  // Step 2: Pass 1 - Exact match by txn_id
  const exactResult = exactMatch(dedupInternal, dedupBank)
  allExceptions.push(...exactResult.exceptions)
  const matched_pairs = exactResult.matched
  
  // Step 3: Pass 2 - Fuzzy match by amount + date
  const fuzzyResult = fuzzyMatch(exactResult.unmatched_internal, exactResult.unmatched_bank)
  allExceptions.push(...fuzzyResult.exceptions)
  
  // Step 4: Classify remaining unmatched as missing exceptions
  fuzzyResult.unmatched_internal.forEach(txn => {
    allExceptions.push(buildMissingInBankException(txn))
  })
  
  fuzzyResult.unmatched_bank.forEach(txn => {
    allExceptions.push(buildMissingInLedgerException(txn))
  })
  
  // Calculate match rate and matched record count
  // matched_pairs = number of perfectly matched transaction pairs
  // matched_count = total records that were matched (each pair = 2 records)
  const matched_count = matched_pairs * 2
  const match_rate = total_records > 0
    ? parseFloat((matched_count / total_records).toFixed(MATCH_RATE_PRECISION))
    : 0
  
  return {
    total_records,
    matched_count,
    match_rate,
    exceptions: allExceptions,
  }
}
