/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Type definitions for database tables
export interface LedgerTransaction {
  id: number
  txn_id: string
  amount: number
  fee: number
  date: string
  merchant_id: string
  source: 'internal' | 'bank'
  created_at: string
}

export interface ReconciliationRun {
  id: number
  created_at: string
  total_records: number
  matched_count: number
  match_rate: number
}

export interface Exception {
  id: number
  run_id: number
  type: 'missing_in_ledger' | 'missing_in_bank' | 'amount_mismatch' | 'fee_mismatch' | 'duplicate' | 'timing_lag'
  internal_txn_id: string | null
  bank_txn_id: string | null
  detail: string
  resolved: boolean
  created_at: string
}
