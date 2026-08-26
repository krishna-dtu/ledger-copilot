/**
 * Synthetic transaction data generator
 * Generates 60-80 paired transactions with realistic failure modes
 */

import { Transaction } from '@/lib/reconciliation/types'

interface SyntheticDataset {
  internal: Transaction[]
  bank: Transaction[]
}

/**
 * Generate a transaction ID
 */
function generateTxnId(index: number): string {
  return `TXN${String(index).padStart(4, '0')}`
}

/**
 * Generate a random amount between min and max
 */
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min)
}

/**
 * Calculate fee (2% of amount)
 */
function calculateFee(amount: number): number {
  return Math.round(amount * 0.02 * 100) / 100
}

/**
 * Generate a date string (YYYY-MM-DD)
 */
function generateDate(baseDate: Date, offsetDays: number = 0): string {
  const date = new Date(baseDate)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split('T')[0]
}

/**
 * Generate merchant ID
 */
function generateMerchantId(index: number): string {
  return `MERCH${String(index % 20).padStart(3, '0')}`
}

/**
 * Generate synthetic transaction dataset
 * Target: 60-80 paired transactions with realistic failures
 */
export function generateSyntheticData(): SyntheticDataset {
  const internal: Transaction[] = []
  const bank: Transaction[] = []
  
  const baseDate = new Date('2026-08-01')
  let txnCounter = 1
  let merchantCounter = 1
  
  // 1. Generate 45 perfect matches (baseline)
  for (let i = 0; i < 45; i++) {
    const txnId = generateTxnId(txnCounter++)
    const amount = randomAmount(500, 50000)
    const fee = calculateFee(amount)
    const date = generateDate(baseDate, Math.floor(i / 3)) // spread across ~15 days
    const merchantId = generateMerchantId(merchantCounter++)
    
    internal.push({ txn_id: txnId, amount, fee, date, merchant_id: merchantId })
    bank.push({ txn_id: txnId, amount, fee, date, merchant_id: merchantId })
  }
  
  // 2. Generate 5 amount mismatches (fee calculation errors)
  for (let i = 0; i < 5; i++) {
    const txnId = generateTxnId(txnCounter++)
    const amount = randomAmount(1000, 20000)
    const correctFee = calculateFee(amount)
    const date = generateDate(baseDate, 10 + i)
    const merchantId = generateMerchantId(merchantCounter++)
    
    // Internal has correct amount, bank has incorrect (fee miscalculated, deducted wrong amount)
    const amountDiff = randomAmount(5, 50)
    
    internal.push({ txn_id: txnId, amount, fee: correctFee, date, merchant_id: merchantId })
    bank.push({ 
      txn_id: txnId, 
      amount: amount - amountDiff, // bank shows less due to fee error
      fee: correctFee, 
      date, 
      merchant_id: merchantId 
    })
  }
  
  // 3. Generate 5 missing-in-bank (ledger recorded but bank settlement never came through)
  for (let i = 0; i < 5; i++) {
    const txnId = generateTxnId(txnCounter++)
    const amount = randomAmount(800, 15000)
    const fee = calculateFee(amount)
    const date = generateDate(baseDate, 15 + i)
    const merchantId = generateMerchantId(merchantCounter++)
    
    internal.push({ txn_id: txnId, amount, fee, date, merchant_id: merchantId })
    // No corresponding bank entry
  }
  
  // 4. Generate 5 missing-in-ledger (bank settled but not recorded in ledger)
  for (let i = 0; i < 5; i++) {
    const txnId = generateTxnId(txnCounter++)
    const amount = randomAmount(600, 12000)
    const fee = calculateFee(amount)
    const date = generateDate(baseDate, 20 + i)
    const merchantId = generateMerchantId(merchantCounter++)
    
    // No internal entry
    bank.push({ txn_id: txnId, amount, fee, date, merchant_id: merchantId })
  }
  
  // 5. Generate 2 duplicates (1 internal, 1 bank)
  
  // Duplicate in internal ledger (accidental double-entry)
  const dupTxnId1 = generateTxnId(txnCounter++)
  const dupAmount1 = randomAmount(1500, 8000)
  const dupFee1 = calculateFee(dupAmount1)
  const dupDate1 = generateDate(baseDate, 25)
  const dupMerchant1 = generateMerchantId(merchantCounter++)
  
  internal.push({ txn_id: dupTxnId1, amount: dupAmount1, fee: dupFee1, date: dupDate1, merchant_id: dupMerchant1 })
  internal.push({ txn_id: dupTxnId1, amount: dupAmount1, fee: dupFee1, date: dupDate1, merchant_id: dupMerchant1 }) // duplicate
  bank.push({ txn_id: dupTxnId1, amount: dupAmount1, fee: dupFee1, date: dupDate1, merchant_id: dupMerchant1 })
  
  // Duplicate in bank (settlement processed twice)
  const dupTxnId2 = generateTxnId(txnCounter++)
  const dupAmount2 = randomAmount(2000, 10000)
  const dupFee2 = calculateFee(dupAmount2)
  const dupDate2 = generateDate(baseDate, 26)
  const dupMerchant2 = generateMerchantId(merchantCounter++)
  
  internal.push({ txn_id: dupTxnId2, amount: dupAmount2, fee: dupFee2, date: dupDate2, merchant_id: dupMerchant2 })
  bank.push({ txn_id: dupTxnId2, amount: dupAmount2, fee: dupFee2, date: dupDate2, merchant_id: dupMerchant2 })
  bank.push({ txn_id: dupTxnId2, amount: dupAmount2, fee: dupFee2, date: dupDate2, merchant_id: dupMerchant2 }) // duplicate
  
  // 6. Generate 3 timing-lag entries (settlement delayed 1-2 days)
  for (let i = 0; i < 3; i++) {
    const internalTxnId = generateTxnId(txnCounter++)
    const bankTxnId = generateTxnId(txnCounter++) // different IDs
    const amount = randomAmount(3000, 25000)
    const fee = calculateFee(amount)
    const internalDate = generateDate(baseDate, 27 + i)
    const bankDate = generateDate(baseDate, 27 + i + (i % 2 === 0 ? 1 : 2)) // 1 or 2 day delay
    const merchantId = generateMerchantId(merchantCounter++)
    
    internal.push({ txn_id: internalTxnId, amount, fee, date: internalDate, merchant_id: merchantId })
    bank.push({ txn_id: bankTxnId, amount, fee, date: bankDate, merchant_id: merchantId })
  }
  
  // 7. Add a few more perfect matches to reach 60-80 total range
  const additionalMatches = randomAmount(5, 10)
  for (let i = 0; i < additionalMatches; i++) {
    const txnId = generateTxnId(txnCounter++)
    const amount = randomAmount(700, 18000)
    const fee = calculateFee(amount)
    const date = generateDate(baseDate, 30 + Math.floor(i / 2))
    const merchantId = generateMerchantId(merchantCounter++)
    
    internal.push({ txn_id: txnId, amount, fee, date, merchant_id: merchantId })
    bank.push({ txn_id: txnId, amount, fee, date, merchant_id: merchantId })
  }
  
  return { internal, bank }
}

/**
 * Get a summary of what was intentionally injected
 */
export function getInjectedFailuresSummary(): string {
  return `
Injected Failure Modes:
- 45+ perfect matches (baseline)
- 5 amount mismatches (fee calculation errors, ₹5-50 difference)
- 5 missing-in-bank (ledger recorded, bank never settled)
- 5 missing-in-ledger (bank settled, not recorded in ledger)
- 2 duplicates (1 in internal ledger, 1 in bank)
- 3 timing-lag cases (bank settled 1-2 days after ledger date)
- 5-10 additional perfect matches (to reach 60-80 total range)
`.trim()
}
