/**
 * Matching logic for reconciliation engine
 * Pass 1: Exact match by txn_id
 * Pass 2: Fuzzy match by amount + date
 */

import { Transaction, ExactMatchResult, FuzzyMatchResult, DuplicateDetectionResult } from './types'
import {
  buildDuplicateException,
  buildAmountMismatchException,
  buildFeeMismatchException,
  buildTimingLagException,
} from './exceptions'
import { AMOUNT_TOLERANCE, DATE_TOLERANCE_DAYS, FLOAT_TOLERANCE } from './constants'
import { dateDiffDays, isBankDateLaterOrEqual, amountDiff } from './utils'

/**
 * Detect duplicate txn_ids within each source
 * Returns exceptions for duplicates and deduplicated arrays (keeping first occurrence)
 */
export function detectDuplicates(
  internal: Transaction[],
  bank: Transaction[]
): DuplicateDetectionResult {
  const exceptions: DuplicateDetectionResult['exceptions'] = []
  
  // Detect internal duplicates
  const internalGroups = new Map<string, Transaction[]>()
  internal.forEach(txn => {
    const group = internalGroups.get(txn.txn_id) || []
    group.push(txn)
    internalGroups.set(txn.txn_id, group)
  })
  
  const dedupInternal: Transaction[] = []
  internalGroups.forEach((group, txn_id) => {
    if (group.length > 1) {
      exceptions.push(buildDuplicateException(txn_id, group.length, 'internal'))
    }
    dedupInternal.push(group[0])  // keep first occurrence
  })
  
  // Detect bank duplicates
  const bankGroups = new Map<string, Transaction[]>()
  bank.forEach(txn => {
    const group = bankGroups.get(txn.txn_id) || []
    group.push(txn)
    bankGroups.set(txn.txn_id, group)
  })
  
  const dedupBank: Transaction[] = []
  bankGroups.forEach((group, txn_id) => {
    if (group.length > 1) {
      exceptions.push(buildDuplicateException(txn_id, group.length, 'bank'))
    }
    dedupBank.push(group[0])  // keep first occurrence
  })
  
  return {
    exceptions,
    deduplicated: [...dedupInternal, ...dedupBank],
  }
}

/**
 * Pass 1: Exact match by txn_id
 * Compare all fields - if amounts/fees/dates differ, create typed exceptions
 */
export function exactMatch(
  internal: Transaction[],
  bank: Transaction[]
): ExactMatchResult {
  const exceptions: ExactMatchResult['exceptions'] = []
  let matched = 0
  
  // Build map of internal transactions by txn_id
  const internalMap = new Map<string, Transaction>()
  internal.forEach(txn => internalMap.set(txn.txn_id, txn))
  
  // Track which bank transactions matched
  const matchedBankIds = new Set<string>()
  
  // Process bank transactions
  bank.forEach(bankTxn => {
    const internalTxn = internalMap.get(bankTxn.txn_id)
    
    if (internalTxn) {
      // Found matching txn_id - compare fields
      const amountMatch = Math.abs(internalTxn.amount - bankTxn.amount) < FLOAT_TOLERANCE
      const feeMatch = Math.abs(internalTxn.fee - bankTxn.fee) < FLOAT_TOLERANCE
      const dateMatch = internalTxn.date === bankTxn.date
      
      if (amountMatch && feeMatch && dateMatch) {
        // Perfect match!
        matched++
        matchedBankIds.add(bankTxn.txn_id)
        internalMap.delete(internalTxn.txn_id)  // remove from unmatched
      } else if (!amountMatch) {
        // Amount mismatch (fee may or may not match)
        exceptions.push(buildAmountMismatchException(internalTxn, bankTxn))
        matchedBankIds.add(bankTxn.txn_id)
        internalMap.delete(internalTxn.txn_id)  // remove from unmatched (matched but with exception)
      } else if (!feeMatch) {
        // Fee mismatch (amount matches)
        exceptions.push(buildFeeMismatchException(internalTxn, bankTxn))
        matchedBankIds.add(bankTxn.txn_id)
        internalMap.delete(internalTxn.txn_id)  // remove from unmatched
      }
      // Note: date mismatch alone doesn't create exception here - will be handled by fuzzy match
    }
  })
  
  // Unmatched transactions
  const unmatched_internal = Array.from(internalMap.values())
  const unmatched_bank = bank.filter(txn => !matchedBankIds.has(txn.txn_id))
  
  return {
    matched,
    exceptions,
    unmatched_internal,
    unmatched_bank,
  }
}

/**
 * Pass 2: Fuzzy match by amount + date
 * Applied to unmatched records from Pass 1
 * Matches are reported as timing_lag exceptions (not counted as matches)
 */
export function fuzzyMatch(
  internal: Transaction[],
  bank: Transaction[]
): FuzzyMatchResult {
  const exceptions: FuzzyMatchResult['exceptions'] = []
  const matchedInternalIds = new Set<string>()
  const matchedBankIds = new Set<string>()
  
  internal.forEach(internalTxn => {
    if (matchedInternalIds.has(internalTxn.txn_id)) return
    
    // Find bank candidates that match amount + date tolerances
    const candidates = bank.filter(bankTxn => {
      if (matchedBankIds.has(bankTxn.txn_id)) return false
      
      const amtDiff = amountDiff(internalTxn.amount, bankTxn.amount)
      const daysDiff = dateDiffDays(internalTxn.date, bankTxn.date)
      const bankLaterOrEqual = isBankDateLaterOrEqual(internalTxn.date, bankTxn.date)
      
      // Check all conditions:
      // 1. Amount within tolerance
      // 2. Date within tolerance (1-2 days, NOT 0 days per Edge Case 4)
      // 3. Bank date >= internal date
      return (
        amtDiff <= AMOUNT_TOLERANCE &&
        daysDiff > 0 &&
        daysDiff <= DATE_TOLERANCE_DAYS &&
        bankLaterOrEqual
      )
    })
    
    if (candidates.length > 0) {
      // Pick the candidate with smallest date difference
      const bestMatch = candidates.reduce((best, current) => {
        const bestDiff = dateDiffDays(internalTxn.date, best.date)
        const currentDiff = dateDiffDays(internalTxn.date, current.date)
        return currentDiff < bestDiff ? current : best
      })
      
      // Create timing_lag exception
      exceptions.push(buildTimingLagException(internalTxn, bestMatch))
      
      // Mark both as matched (so they won't be reported as missing)
      matchedInternalIds.add(internalTxn.txn_id)
      matchedBankIds.add(bestMatch.txn_id)
    }
  })
  
  // Remaining unmatched
  const unmatched_internal = internal.filter(txn => !matchedInternalIds.has(txn.txn_id))
  const unmatched_bank = bank.filter(txn => !matchedBankIds.has(txn.txn_id))
  
  return {
    exceptions,
    unmatched_internal,
    unmatched_bank,
  }
}
