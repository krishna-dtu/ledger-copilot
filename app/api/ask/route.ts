/**
 * POST /api/ask
 * Q&A endpoint for the Gemini agent
 */

import { NextRequest, NextResponse } from 'next/server'
import { askAgent } from '@/lib/agent/gemini-agent-simple'  // Using simpler API

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { question } = body

    if (!question || typeof question !== 'string') {
      return NextResponse.json(
        { error: 'Question is required and must be a string' },
        { status: 400 }
      )
    }

    const result = await askAgent(question)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Agent error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
