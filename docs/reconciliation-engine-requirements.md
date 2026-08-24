# Reconciliation Engine — Requirements

## Purpose
The reconciliation engine is the core deterministic logic that matches transaction records from two sources (internal ledger and bank statements) and categorizes all unmatched records into typed exceptions.

## Input
Two arrays of transaction records:
- **Internal ledger transactions**: `{ txn_id, amount, fee, date, merchant_id }`
- **Bank statement transactions**: `{ txn_id, amount, fee, date, merchant_id }`

Both sources use the same schema. In real systems they differ, but for this buildathon we're keeping them aligned to focus on matching logic, not ETL.

## Output
A reconciliation result object containing:
```typescript
{
  total_records: number,           // internal.length + bank.length (includes duplicates)
  matched_count: number,            // successfully matched pairs
  match_rate: number,               // matched_count / total_records (0-1)
  exceptions: Exception[]           // all unmatched/problematic records
}
```

Each exception must include:
```typescript
{
  type: 'missing_in_ledger' | 'missing_in_bank' | 'amount_mismatch' | 
        'fee_mismatch' | 'duplicate' | 'timing_lag',
  internal_txn_id: string | null,  // null if missing in ledger
  bank_txn_id: string | null,      // null if missing in bank
  detail: string                    // human-readable explanation
}
```

## Matching Algorithm Requirements

### Pass 1: Exact Match by `txn_id`
- For each internal record, look for a bank record with the same `txn_id`
- If found and all fields match exactly (amount, fee, date), mark as matched
- If found but fields differ, create typed exception (amount_mismatch, fee_mismatch, or timing_lag)
- Remove matched pairs from further processing

### Pass 2: Fuzzy Match by Amount + Date
Applied only to records that failed Pass 1.

**Tolerance rules:**
- **Amount tolerance**: within ₹1.00 (absolute difference ≤ 1.00)
- **Date tolerance**: within 2 calendar days (absolute difference > 0 and ≤ 2 days)
- **Same-day exclusion**: If dates match exactly (0-day difference), do NOT fuzzy match — treat as unrelated transactions
- **Constraint**: Bank date must be >= internal ledger date (settlement never precedes recognition)

If a fuzzy match is found:
- Create a `timing_lag` exception (not treated as a match, but explained as a known delay pattern)
- Mark the pair so they don't get reported as "missing" exceptions

### Pass 3: Classify Remaining Records
- **Internal records with no match** → `missing_in_bank` exception
- **Bank records with no match** → `missing_in_ledger` exception

### Duplicate Detection
- If the same `txn_id` appears multiple times in the same source, flag as `duplicate` exception
- Run this check before Pass 1

## Exception Type Definitions

| Type | Condition | Detail Format |
|------|-----------|---------------|
| `duplicate` | Same `txn_id` appears >1 time in same source | "Transaction {txn_id} appears {count} times in {source}" |
| `missing_in_ledger` | Bank record has no internal match | "Bank transaction {txn_id} for ₹{amount} has no corresponding ledger entry" |
| `missing_in_bank` | Internal record has no bank match | "Ledger transaction {txn_id} for ₹{amount} has no corresponding bank settlement" |
| `amount_mismatch` | txn_id matches but amounts differ by >₹1 | "Ledger shows ₹{internal_amt}, bank shows ₹{bank_amt} — difference of ₹{diff}" (append "; fee differs by ₹{fee_diff}" if fee also differs) |
| `fee_mismatch` | txn_id matches, amounts match, but fees differ | "Ledger fee ₹{internal_fee}, bank fee ₹{bank_fee} — fee miscalculated by ₹{diff}" |
| `timing_lag` | No txn_id match, but fuzzy match found | "Ledger entry on {internal_date}, bank settled on {bank_date} — {days}-day settlement lag" |

## Edge Cases to Handle

1. **Multiple fuzzy candidates**: If one internal record could match multiple bank records by amount+date, pick the closest date match, flag the rest as `missing_in_bank`
2. **Zero amounts**: Still reconcile them (e.g., refunds, voids)
3. **Negative amounts**: Valid (chargebacks, reversals) — use absolute difference for tolerance
4. **Same-day timing lag**: If dates match exactly but txn_ids differ, do NOT create timing_lag exception — treat as missing

## Non-Requirements (Out of Scope)
- Multi-currency reconciliation (everything is INR)
- Partial settlement matching (one ledger entry → multiple bank entries)
- Manual resolution workflow (just report exceptions, don't provide a way to mark them resolved in this phase)
- Confidence scores on fuzzy matches (binary match/no-match only)

## Success Criteria
- All 60+ synthetic records are classified (matched or exception, nothing lost)
- Match rate calculation is arithmetically correct
- Every exception has a non-empty `detail` string
- No runtime errors on valid input data
- Passes unit tests for all 6 exception types

## Data Format Constraints
- `txn_id`: non-empty string, unique within each source (duplicates flagged as exception)
- `amount`: number (can be negative or zero)
- `fee`: number (typically positive, but can be zero)
- `date`: ISO 8601 date string (YYYY-MM-DD) or Date object
- `merchant_id`: string (not used in matching logic, included for context)

## Performance Target
- Must process 100 records in <500ms on a standard laptop
- No optimization needed beyond O(n log n) — we're not handling millions of records
