/**
 * Test: Run synthetic data through reconciliation engine
 */

import { describe, it, expect } from 'vitest'
import { reconcile } from '@/lib/reconciliation'
import { generateSyntheticData } from '@/lib/data/synthetic-generator'

describe('Synthetic Data Reconciliation', () => {
  it('should process 60-80 transactions with all failure modes', () => {
    // Generate data
    const { internal, bank } = generateSyntheticData()
    
    // Run reconciliation
    const result = reconcile(internal, bank)
    
    // Count exceptions by type
    const exceptionCounts: Record<string, number> = {}
    result.exceptions.forEach(ex => {
      exceptionCounts[ex.type] = (exceptionCounts[ex.type] || 0) + 1
    })
    
    // ACCOUNTING: Every record must be accounted for
    // - matched_count = number of records that matched perfectly (already counts records, not pairs)
    // - amount_mismatch/fee_mismatch = pairs that matched by txn_id but had mismatches (2 records each)
    // - timing_lag = pairs that fuzzy matched (2 records each)
    // - missing_in_bank = internal records with no bank match (1 record each)
    // - missing_in_ledger = bank records with no internal match (1 record each)
    // - duplicate = duplicate records flagged but first occurrence still processed
    
    const matchedRecords = result.matched_count  // already a record count
    const amountMismatchRecords = (exceptionCounts['amount_mismatch'] || 0) * 2
    const feeMismatchRecords = (exceptionCounts['fee_mismatch'] || 0) * 2
    const timingLagRecords = (exceptionCounts['timing_lag'] || 0) * 2
    const missingInBankRecords = (exceptionCounts['missing_in_bank'] || 0) * 1
    const missingInLedgerRecords = (exceptionCounts['missing_in_ledger'] || 0) * 1
    const duplicateRecords = (exceptionCounts['duplicate'] || 0) * 1  // duplicates are extra records beyond pairs
    
    const accountedRecords = matchedRecords + amountMismatchRecords + feeMismatchRecords + 
                             timingLagRecords + missingInBankRecords + missingInLedgerRecords + duplicateRecords
    
    // Print results for verification
    console.log('\n' + '='.repeat(80))
    console.log('SYNTHETIC DATA RECONCILIATION TEST RESULTS')
    console.log('='.repeat(80))
    console.log(`\nGenerated:`)
    console.log(`  Internal transactions: ${internal.length}`)
    console.log(`  Bank transactions: ${bank.length}`)
    console.log(`  Total records: ${result.total_records}`)
    console.log()
    console.log(`Reconciliation Results:`)
    console.log(`  Matched pairs: ${result.matched_count / 2}`)
    console.log(`  Matched records: ${result.matched_count}`)
    console.log(`  Match rate: ${(result.match_rate * 100).toFixed(2)}% (${result.matched_count}/${result.total_records} records)`)
    console.log(`  Total exceptions: ${result.exceptions.length}`)
    console.log()
    console.log(`Exceptions by type (with record accounting):`)
    console.log(`  amount_mismatch     : ${exceptionCounts['amount_mismatch'] || 0} (= ${amountMismatchRecords} records)`)
    console.log(`  fee_mismatch        : ${exceptionCounts['fee_mismatch'] || 0} (= ${feeMismatchRecords} records)`)
    console.log(`  timing_lag          : ${exceptionCounts['timing_lag'] || 0} (= ${timingLagRecords} records)`)
    console.log(`  missing_in_bank     : ${exceptionCounts['missing_in_bank'] || 0} (= ${missingInBankRecords} records)`)
    console.log(`  missing_in_ledger   : ${exceptionCounts['missing_in_ledger'] || 0} (= ${missingInLedgerRecords} records)`)
    console.log(`  duplicate           : ${exceptionCounts['duplicate'] || 0} (= ${duplicateRecords} extra records)`)
    console.log()
    console.log(`ACCOUNTING:`)
    console.log(`  Matched records:          ${matchedRecords}`)
    console.log(`  Amount mismatch records:  ${amountMismatchRecords}`)
    console.log(`  Fee mismatch records:     ${feeMismatchRecords}`)
    console.log(`  Timing lag records:       ${timingLagRecords}`)
    console.log(`  Missing in bank records:  ${missingInBankRecords}`)
    console.log(`  Missing in ledger records: ${missingInLedgerRecords}`)
    console.log(`  Duplicate extra records:  ${duplicateRecords}`)
    console.log(`  ----------------------------------------`)
    console.log(`  TOTAL ACCOUNTED:          ${accountedRecords}`)
    console.log(`  TOTAL RECORDS (expected): ${result.total_records}`)
    console.log(`  DIFFERENCE:               ${result.total_records - accountedRecords}`)
    console.log()
    
    // Show sample exceptions
    console.log('Sample exceptions (first of each type):')
    const exceptionsByType: Record<string, typeof result.exceptions> = {}
    result.exceptions.forEach(ex => {
      if (!exceptionsByType[ex.type]) {
        exceptionsByType[ex.type] = []
      }
      exceptionsByType[ex.type].push(ex)
    })
    
    Object.entries(exceptionsByType).forEach(([type, exceptions]) => {
      console.log(`\n  ${type}:`)
      console.log(`    ${exceptions[0].detail}`)
    })
    console.log('\n' + '='.repeat(80))
    
    // Assertions
    expect(result.total_records).toBeGreaterThanOrEqual(60)
    expect(result.total_records).toBeLessThanOrEqual(150)
    expect(exceptionCounts['amount_mismatch']).toBeGreaterThanOrEqual(4)
    expect(exceptionCounts['missing_in_ledger']).toBeGreaterThanOrEqual(4)
    expect(exceptionCounts['missing_in_bank']).toBeGreaterThanOrEqual(4)
    expect(exceptionCounts['duplicate']).toBeGreaterThanOrEqual(2)
    expect(exceptionCounts['timing_lag']).toBeGreaterThanOrEqual(3)
    
    // Verify accounting matches
    expect(accountedRecords).toBe(result.total_records)
  })
})
