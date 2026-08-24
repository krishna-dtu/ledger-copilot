/**
 * Exception builders for reconciliation engine
 * Each function creates a properly formatted exception with detail strings
 */

import { Exception, Transaction, ExceptionType } from './types'
import { formatINR, amountDiff, dateDiffDays } from './utils'

export function buildDuplicateException(
  txn_id: string,
  count: number,
  source: 'internal' | 'bank'
): Exception {
  return {
    type: 'duplicate',
    internal_txn_id: source === 'internal' ? txn_id : null,
    bank_txn_id: source === 'bank' ? txn_id : null,
    detail: `Transaction ${txn_id} appears ${count} times in ${source}`,
  }
}

export function buildMissingInBankException(internal: Transaction): Exception {
  return {
    type: 'missing_in_bank',
    internal_txn_id: internal.txn_id,
    bank_txn_id: null,
    detail: `Ledger transaction ${internal.txn_id} for ${formatINR(internal.amount)} has no corresponding bank settlement`,
  }
}

export function buildMissingInLedgerException(bank: Transaction): Exception {
  return {
    type: 'missing_in_ledger',
    internal_txn_id: null,
    bank_txn_id: bank.txn_id,
    detail: `Bank transaction ${bank.txn_id} for ${formatINR(bank.amount)} has no corresponding ledger entry`,
  }
}

export function buildAmountMismatchException(
  internal: Transaction,
  bank: Transaction
): Exception {
  const diff = amountDiff(internal.amount, bank.amount)
  const feeDiff = amountDiff(internal.fee, bank.fee)
  
  let detail = `Ledger shows ${formatINR(internal.amount)}, bank shows ${formatINR(bank.amount)} — difference of ${formatINR(diff)}`
  
  // If fee also differs, append fee difference
  if (feeDiff >= 0.01) {
    detail += `; fee differs by ${formatINR(feeDiff)}`
  }
  
  return {
    type: 'amount_mismatch',
    internal_txn_id: internal.txn_id,
    bank_txn_id: bank.txn_id,
    detail,
  }
}

export function buildFeeMismatchException(
  internal: Transaction,
  bank: Transaction
): Exception {
  const diff = amountDiff(internal.fee, bank.fee)
  
  return {
    type: 'fee_mismatch',
    internal_txn_id: internal.txn_id,
    bank_txn_id: bank.txn_id,
    detail: `Ledger fee ${formatINR(internal.fee)}, bank fee ${formatINR(bank.fee)} — fee miscalculated by ${formatINR(diff)}`,
  }
}

export function buildTimingLagException(
  internal: Transaction,
  bank: Transaction
): Exception {
  const days = dateDiffDays(internal.date, bank.date)
  
  return {
    type: 'timing_lag',
    internal_txn_id: internal.txn_id,
    bank_txn_id: bank.txn_id,
    detail: `Ledger entry on ${internal.date}, bank settled on ${bank.date} — ${days}-day settlement lag`,
  }
}
