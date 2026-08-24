# Reconciliation Engine — Design

## Module Structure

```
lib/
  reconciliation/
    types.ts              # TypeScript interfaces for transactions, exceptions, results
    engine.ts             # Main reconciliation function
    matchers.ts           # Pass 1 (exact match) and Pass 2 (fuzzy match) logic
    exceptions.ts         # Exception builders (format detail strings)
    utils.ts              # Date diff, amount comparison, INR formatting
  
__tests__/
  reconciliation/
    engine.test.ts        # Integration tests for full reconciliation runs
    matchers.test.ts      # Unit tests for matching logic
    exceptions.test.ts    # Unit tests for exception detail formatting
    fixtures.ts           # Hand-crafted test data for each exception type
```

## Core Types

### `Transaction`
```typescript
interface Transaction {
  txn_id: string
  amount: number        // in INR, can be negative/zero
  fee: number           // in INR, typically positive
  date: string          // ISO 8601 date (YYYY-MM-DD)
  merchant_id: string
  source: 'internal' | 'bank'  // added by engine for tracking
}
```

### `Exception`
```typescript
type ExceptionType = 
  | 'missing_in_ledger' 
  | 'missing_in_bank' 
  | 'amount_mismatch' 
  | 'fee_mismatch' 
  | 'duplicate' 
  | 'timing_lag'

interface Exception {
  type: ExceptionType
  internal_txn_id: string | null
  bank_txn_id: string | null
  detail: string
}
```

### `ReconciliationResult`
```typescript
interface ReconciliationResult {
  total_records: number   // internal.length + bank.length (includes duplicates)
  matched_count: number
  match_rate: number      // matched_count / total_records, rounded to 4 decimals
  exceptions: Exception[]
}
```

## Algorithm Flow

```
┌─────────────────────────────────────┐
│ Input: internal[], bank[]           │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Step 0: Duplicate Detection         │
│ - Group by txn_id within each source│
│ - Flag any txn_id that appears >1   │
│ - Create 'duplicate' exceptions     │
│ - Keep only first occurrence        │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Pass 1: Exact Match by txn_id      │
│ - Build Map<txn_id, InternalRecord> │
│ - For each bank record:             │
│   • Lookup by txn_id                │
│   • If found:                       │
│     - Compare amount, fee, date     │
│     - If all match → MATCHED        │
│     - If amount differs → exception │
│     - If fee differs → exception    │
│     - Remove both from unmatched    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Pass 2: Fuzzy Match (amount + date)│
│ - For each unmatched internal:      │
│   • Find bank records where:        │
│     - |amount_diff| ≤ ₹1.00         │
│     - |date_diff| ≤ 2 days          │
│     - bank_date >= internal_date    │
│   • If match found:                 │
│     - Create 'timing_lag' exception │
│     - Remove both from unmatched    │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Pass 3: Classify Remaining          │
│ - Unmatched internal records →      │
│   'missing_in_bank' exception       │
│ - Unmatched bank records →          │
│   'missing_in_ledger' exception     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ Compute match_rate and return       │
│ match_rate = matched / total        │
└─────────────────────────────────────┘
```

## Implementation Details

### `reconcile(internal: Transaction[], bank: Transaction[]): ReconciliationResult`
Main entry point. Orchestrates all passes and returns final result.

**Steps:**
1. Calculate `total_records = internal.length + bank.length` (includes duplicates in denominator)
2. Run duplicate detection on both sources
3. Run Pass 1 exact matching
4. Run Pass 2 fuzzy matching on remaining unmatched
5. Classify all remaining as missing exceptions
6. Calculate match rate
7. Return result

### `detectDuplicates(transactions: Transaction[]): { exceptions: Exception[], deduplicated: Transaction[] }`
- Group transactions by `txn_id`
- For any group with size > 1, create duplicate exception
- Return first occurrence of each txn_id for further processing

### `exactMatch(internal: Transaction[], bank: Transaction[]): { matched: number, exceptions: Exception[], unmatched_internal: Transaction[], unmatched_bank: Transaction[] }`
- Build a `Map<txn_id, Transaction>` from internal array
- Iterate through bank transactions:
  - If `txn_id` exists in map:
    - Compare fields
    - If exact match: increment matched counter
    - If mismatch: create appropriate exception (amount_mismatch, fee_mismatch)
    - Remove from map
  - If not found: add to unmatched_bank
- Remaining items in map become unmatched_internal

**Field comparison logic:**
```typescript
const isExactMatch = (a: Transaction, b: Transaction) => {
  return (
    Math.abs(a.amount - b.amount) < 0.01 &&  // floating point tolerance
    Math.abs(a.fee - b.fee) < 0.01 &&
    a.date === b.date
  )
}

const isAmountMismatch = (a: Transaction, b: Transaction) => {
  return Math.abs(a.amount - b.amount) >= 0.01
}

const isFeeMismatch = (a: Transaction, b: Transaction) => {
  return (
    Math.abs(a.amount - b.amount) < 0.01 &&
    Math.abs(a.fee - b.fee) >= 0.01
  )
}
```

### `fuzzyMatch(internal: Transaction[], bank: Transaction[]): { exceptions: Exception[], unmatched_internal: Transaction[], unmatched_bank: Transaction[] }`
- For each unmatched internal transaction:
  - Find all bank candidates where:
    - `|amount_internal - amount_bank| <= 1.00`
    - `dateDiff(bank.date, internal.date) <= 2 days`
    - `dateDiff(bank.date, internal.date) > 0 days` (exclude same-day matches per Edge Case 4)
    - `bank.date >= internal.date` (settlement never precedes ledger)
  - If candidates found:
    - Pick the one with smallest date difference
    - Create `timing_lag` exception
    - Remove both from unmatched arrays
- Return remaining unmatched + timing_lag exceptions

**Date comparison:**
```typescript
const dateDiffDays = (date1: string, date2: string): number => {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffMs = d2.getTime() - d1.getTime()
  return Math.abs(Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

const isBankDateLater = (internalDate: string, bankDate: string): boolean => {
  return new Date(bankDate) >= new Date(internalDate)
}
```

### `buildException(type: ExceptionType, internal: Transaction | null, bank: Transaction | null): Exception`
Factory function for creating exceptions with properly formatted detail strings.

**Detail string formats:**
- `duplicate`: `"Transaction {txn_id} appears {count} times in {source}"`
- `missing_in_ledger`: `"Bank transaction {txn_id} for ₹{amount} has no corresponding ledger entry"`
- `missing_in_bank`: `"Ledger transaction {txn_id} for ₹{amount} has no corresponding bank settlement"`
- `amount_mismatch`: `"Ledger shows ₹{internal_amt}, bank shows ₹{bank_amt} — difference of ₹{diff}"` (if fee also differs, append `"; fee differs by ₹{fee_diff}"`)
- `fee_mismatch`: `"Ledger fee ₹{internal_fee}, bank fee ₹{bank_fee} — fee miscalculated by ₹{diff}"`
- `timing_lag`: `"Ledger entry on {internal_date}, bank settled on {bank_date} — {days}-day settlement lag"`

### `formatINR(amount: number): string`
Formats numbers in Indian numbering system with rupee symbol.
```typescript
// Example: 450000 → "₹4,50,000"
// Example: 4500.50 → "₹4,500.50"
```

Use `Intl.NumberFormat` with `'en-IN'` locale:
```typescript
const formatINR = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
```

## Test Strategy

### Unit Tests (`matchers.test.ts`)
Test each matching pass in isolation with minimal fixtures:
- **Exact match**: 2 identical records → matched
- **Amount mismatch**: same txn_id, different amounts → exception
- **Fee mismatch**: same txn_id, different fees → exception
- **Fuzzy match**: different txn_ids, similar amount+date → timing_lag
- **Fuzzy match rejection**: date out of tolerance → no match
- **Fuzzy match rejection**: bank date < internal date → no match

### Integration Tests (`engine.test.ts`)
Test full reconciliation runs with mixed scenarios:
- **Happy path**: 10 perfect matches → 100% match rate
- **All exception types**: Hand-crafted batch with 1 of each exception type
- **Edge case**: Zero amounts, negative amounts, same-day duplicates

### Fixture Design (`fixtures.ts`)
Create named fixture sets:
```typescript
export const PERFECT_MATCH_SET = {
  internal: [{ txn_id: 'TXN001', amount: 1000, ... }],
  bank: [{ txn_id: 'TXN001', amount: 1000, ... }],
  expected: {
    matched_count: 1,
    match_rate: 1.0,
    exceptions: []
  }
}

export const AMOUNT_MISMATCH_SET = { ... }
export const TIMING_LAG_SET = { ... }
// ... one fixture per exception type
```

### Coverage Target
- 100% coverage on `matchers.ts` (all branches)
- 90%+ on `engine.ts` (main flow + error paths)
- 100% on `exceptions.ts` (string formatting)

## Performance Considerations

### Time Complexity
- **Pass 1 (exact match)**: O(n) with hash map lookup
- **Pass 2 (fuzzy match)**: O(n²) worst case (nested loop over unmatched)
  - Optimization: Build amount-bucketed index if >1000 records
  - For buildathon (60-80 records), naive nested loop is fine
- **Overall**: O(n²) worst case, but n=60-80 → fast enough

### Memory Usage
- Store all transactions in memory (acceptable for <1000 records)
- Avoid copying transaction objects unnecessarily
- Use transaction IDs for tracking, not full object clones

## Error Handling

### Input Validation
```typescript
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
```

Run validation at the start of `reconcile()` function.

### Graceful Degradation
- If date parsing fails for one transaction, treat as invalid date (infinite date diff) → no fuzzy match
- If amount is `NaN` or `Infinity`, validation should catch it before processing

## Design Limitations to Document

### Duplicate Detection Scope
The current duplicate detection only identifies repeated `txn_id` values within each source. It does NOT detect:
- Same amount + date + merchant but different txn_ids (semantic duplicates)
- Transactions that appear in both sources with different IDs (these may be caught by fuzzy match as timing_lag)

This limitation should be documented in `architecture.md` when finalizing the project. For the buildathon scope, txn_id-based detection is sufficient.

## Non-Goals for This Phase
- **Persistence**: Engine returns a result object. Saving to Supabase happens in the API layer, not here.
- **Logging**: No structured logs inside the engine. Return all information in the result object.
- **Concurrency**: Single-threaded, synchronous processing. No async needed.
- **Configuration**: Tolerances (₹1, 2 days) are hardcoded constants. No config file needed yet.

## Naming Conventions
- Functions: `camelCase` (`reconcile`, `exactMatch`, `fuzzyMatch`)
- Types/Interfaces: `PascalCase` (`Transaction`, `Exception`, `ReconciliationResult`)
- Constants: `UPPER_SNAKE_CASE` (`AMOUNT_TOLERANCE`, `DATE_TOLERANCE_DAYS`)
- Files: `kebab-case` (`reconciliation-engine.ts`, `exception-builders.ts`)

## Constants
```typescript
export const AMOUNT_TOLERANCE = 1.00  // INR
export const DATE_TOLERANCE_DAYS = 2
export const MATCH_RATE_PRECISION = 4 // decimal places
```

## Next Steps (After Approval)
1. Implement `types.ts` (interfaces)
2. Implement `utils.ts` (formatINR, dateDiff)
3. Implement `exceptions.ts` (exception builders)
4. Implement `matchers.ts` (exact + fuzzy matching)
5. Implement `engine.ts` (main reconcile function)
6. Write unit tests (one file at a time, test-driven)
7. Write integration tests with full fixture sets
8. Run all tests and verify 100% pass rate

---

**Review checklist:**
- [ ] Does the algorithm cover all 6 exception types?
- [ ] Is the fuzzy matching logic clear and testable?
- [ ] Are the tolerance values reasonable?
- [ ] Is the match rate calculation correct?
- [ ] Are edge cases (duplicates, zero amounts) handled?
- [ ] Is the detail string formatting spec clear enough to implement?
