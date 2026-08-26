/**
 * GET /api/exceptions?type=...&run_id=...
 * Fetches exceptions with optional filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/db/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const typeFilter = searchParams.get('type')
    const runIdFilter = searchParams.get('run_id')

    // Build query
    let query = supabase
      .from('exceptions')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (typeFilter) {
      query = query.eq('type', typeFilter)
    }

    if (runIdFilter) {
      const runId = parseInt(runIdFilter, 10)
      if (!isNaN(runId)) {
        query = query.eq('run_id', runId)
      }
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch exceptions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      count: data?.length || 0,
      exceptions: data || [],
    })
  } catch (error) {
    console.error('Exceptions fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
