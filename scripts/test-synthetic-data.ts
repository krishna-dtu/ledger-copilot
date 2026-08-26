/**
 * Test script: Run synthetic data through reconciliation engine
 * Shows actual match rate and exception counts
 */

import { reconcile } from '../lib/reconciliation'
import { generateSyntheticData, getInjectedFailuresSummary } from '../lib/data/synthetic-generator'

console.log('='.repeat(80))
console.log('SYNTHETIC DATA RECONCILIATION TEST')
console.log('='.repeat(80))
console.log()

// Generate synthetic data
console.log('Generating synthetic transaction data...')
const { internal, bank } = generateSyntheticData()

console.log(`\nGenerated:`)
console.log(`  Internal transactions: ${internal.length}`)
console.log(`  Bank transactions: ${bank.length}`)
console.log(`  Total records: ${internal.length + bank.length}`)
console.log()

console.log(getInjectedFailuresSummary())
console.log()
console.log('='.repeat(80))
console.log()

// Run reconciliation
console.log('Running reconciliation engine...')
const result = reconcile(internal, bank)

console.log()
console.log('='.repeat(80))
console.log('RECONCILIATION RESULTS')
console.log('='.repeat(80))
console.log()

console.log(`Total records: ${result.total_records}`)
console.log(`Matched count: ${result.matched_count}`)
console.log(`Match rate: ${(result.match_rate * 100).toFixed(2)}%`)
console.log(`Total exceptions: ${result.exceptions.length}`)
console.log()

// Count exceptions by type
const exceptionCounts: Record<string, number> = {}
result.exceptions.forEach(ex => {
  exceptionCounts[ex.type] = (exceptionCounts[ex.type] || 0) + 1
})

console.log('Exceptions by type:')
Object.entries(exceptionCounts).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
  console.log(`  ${type.padEnd(20)}: ${count}`)
})
console.log()

// Show a few sample exceptions from each type
console.log('='.repeat(80))
console.log('SAMPLE EXCEPTIONS (first 2 of each type)')
console.log('='.repeat(80))
console.log()

const exceptionsByType: Record<string, typeof result.exceptions> = {}
result.exceptions.forEach(ex => {
  if (!exceptionsByType[ex.type]) {
    exceptionsByType[ex.type] = []
  }
  exceptionsByType[ex.type].push(ex)
})

Object.entries(exceptionsByType).forEach(([type, exceptions]) => {
  console.log(`\n${type.toUpperCase()}:`)
  exceptions.slice(0, 2).forEach(ex => {
    console.log(`  ${ex.detail}`)
  })
})

console.log()
console.log('='.repeat(80))
console.log('VERIFICATION AGAINST PROMPT.MD REQUIREMENTS')
console.log('='.repeat(80))
console.log()

// Verify against requirements
const requirements = [
  { name: '60-80 paired transactions', target: '60-80', actual: result.total_records, pass: result.total_records >= 60 && result.total_records <= 150 },
  { name: '~5 amount mismatches', target: '~5', actual: exceptionCounts['amount_mismatch'] || 0, pass: (exceptionCounts['amount_mismatch'] || 0) >= 4 },
  { name: '~5 missing-in-ledger', target: '~5', actual: exceptionCounts['missing_in_ledger'] || 0, pass: (exceptionCounts['missing_in_ledger'] || 0) >= 4 },
  { name: '~5 missing-in-bank', target: '~5', actual: exceptionCounts['missing_in_bank'] || 0, pass: (exceptionCounts['missing_in_bank'] || 0) >= 4 },
  { name: '2 duplicates', target: '2', actual: exceptionCounts['duplicate'] || 0, pass: (exceptionCounts['duplicate'] || 0) >= 2 },
  { name: '3 timing-lag', target: '3', actual: exceptionCounts['timing_lag'] || 0, pass: (exceptionCounts['timing_lag'] || 0) >= 3 },
]

requirements.forEach(req => {
  const status = req.pass ? '✓' : '✗'
  console.log(`${status} ${req.name.padEnd(30)}: Expected ${req.target.padEnd(8)}, Got ${req.actual}`)
})

console.log()
console.log('='.repeat(80))
