/**
 * GET /api/transaction/:txnId
 * Fetches transaction details by txn_id, showing which side(s) it appears on
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { txnId: string } }
) {
  try {
    const txnId = params.txnId

    if (!txnId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Fetch all records with this txn_id
    const { data, error } = await supabase
      .from('ledger_transactions')
      .select('*')
      .eq('txn_id', txnId)
      .order('source', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch transaction', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Transaction not found', txn_id: txnId },
        { status: 404 }
      )
    }

    // Separate by source
    const internal = data.filter(t => t.source === 'internal')
    const bank = data.filter(t => t.source === 'bank')

    return NextResponse.json({
      txn_id: txnId,
      exists_in_internal: internal.length > 0,
      exists_in_bank: bank.length > 0,
      internal_records: internal,
      bank_records: bank,
      total_occurrences: data.length,
    })
  } catch (error) {
    console.error('Transaction fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
