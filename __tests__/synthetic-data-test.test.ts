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
    console.log(`  Matched count: ${result.matched_count}`)
    console.log(`  Match rate: ${(result.match_rate * 100).toFixed(2)}%`)
    console.log(`  Total exceptions: ${result.exceptions.length}`)
    console.log()
    console.log(`Exceptions by type:`)
    Object.entries(exceptionCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
      console.log(`  ${type.padEnd(20)}: ${count}`)
    })
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
  })
})
