/**
 * POST /api/reconcile - Runs reconciliation over current transaction data
 * GET /api/reconcile - Gets the latest reconciliation run summary
 */

import { NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'
import { reconcile } from '@/lib/reconciliation'
import type { Transaction } from '@/lib/reconciliation/types'

export async function GET() {
  try {
    // Fetch latest reconciliation run
    const { data, error } = await supabase
      .from('reconciliation_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'No reconciliation runs found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Get reconciliation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    // Fetch all transactions from database
    const { data: transactions, error: fetchError } = await supabase
      .from('ledger_transactions')
      .select('*')
      .order('date', { ascending: true })

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch transactions', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json(
        { error: 'No transactions found in database' },
        { status: 400 }
      )
    }

    // Separate internal and bank transactions
    const internal: Transaction[] = transactions
      .filter(t => t.source === 'internal')
      .map(t => ({
        txn_id: t.txn_id,
        amount: parseFloat(t.amount.toString()),
        fee: parseFloat(t.fee.toString()),
        date: t.date,
        merchant_id: t.merchant_id,
      }))

    const bank: Transaction[] = transactions
      .filter(t => t.source === 'bank')
      .map(t => ({
        txn_id: t.txn_id,
        amount: parseFloat(t.amount.toString()),
        fee: parseFloat(t.fee.toString()),
        date: t.date,
        merchant_id: t.merchant_id,
      }))

    // Run reconciliation
    const result = reconcile(internal, bank)

    // Insert reconciliation run record
    const { data: runData, error: runError } = await supabase
      .from('reconciliation_runs')
      .insert({
        total_records: result.total_records,
        matched_count: result.matched_count,
        match_rate: result.match_rate,
      })
      .select()
      .single()

    if (runError || !runData) {
      return NextResponse.json(
        { error: 'Failed to create reconciliation run', details: runError?.message },
        { status: 500 }
      )
    }

    // Insert exceptions
    if (result.exceptions.length > 0) {
      const exceptionsToInsert = result.exceptions.map(ex => ({
        run_id: runData.id,
        type: ex.type,
        internal_txn_id: ex.internal_txn_id,
        bank_txn_id: ex.bank_txn_id,
        detail: ex.detail,
        resolved: false,
      }))

      const { error: exceptionsError } = await supabase
        .from('exceptions')
        .insert(exceptionsToInsert)

      if (exceptionsError) {
        return NextResponse.json(
          { error: 'Failed to insert exceptions', details: exceptionsError.message },
          { status: 500 }
        )
      }
    }

    // Return the reconciliation result
    return NextResponse.json({
      run_id: runData.id,
      total_records: result.total_records,
      matched_count: result.matched_count,
      match_rate: result.match_rate,
      exception_count: result.exceptions.length,
      created_at: runData.created_at,
    })
  } catch (error) {
    console.error('Reconciliation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
