/**
 * Mock AI Agent - Returns realistic responses without API calls
 * Use this for demo purposes when API quotas are exceeded
 */

import { supabase } from '@/lib/db/supabase'

interface ToolCall {
  name: string
  args: Record<string, any>
  result: any
}

export interface AgentResponse {
  answer: string
  tool_calls: ToolCall[]
}

/**
 * Execute a tool call by directly querying the database
 */
async function executeTool(toolName: string, args: Record<string, any>): Promise<any> {
  try {
    switch (toolName) {
      case 'get_match_rate': {
        const { data, error } = await supabase
          .from('reconciliation_runs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (error || !data) {
          return { error: 'No reconciliation runs found' }
        }

        return {
          total_records: data.total_records,
          matched_count: data.matched_count,
          match_rate: data.match_rate,
        }
      }
      
      case 'get_exceptions': {
        let query = supabase
          .from('exceptions')
          .select('*')
          .order('created_at', { ascending: false })

        // Filter by type if provided
        if (args.type) {
          query = query.eq('type', args.type)
        }

        // Filter by run_id if provided, otherwise get latest run
        if (args.run_id) {
          query = query.eq('run_id', args.run_id)
        } else {
          // Get latest run ID
          const { data: runData } = await supabase
            .from('reconciliation_runs')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (runData) {
            query = query.eq('run_id', runData.id)
          }
        }

        const { data: exceptions, error } = await query

        if (error) {
          return { error: 'Failed to fetch exceptions' }
        }

        return {
          count: exceptions?.length || 0,
          exceptions: exceptions || [],
        }
      }
      
      case 'get_transaction': {
        const txnId = args.txn_id

        // Fetch from ledger_transactions
        const { data: transactions, error } = await supabase
          .from('ledger_transactions')
          .select('*')
          .eq('txn_id', txnId)

        if (error) {
          return { error: `Failed to fetch transaction ${txnId}` }
        }

        if (!transactions || transactions.length === 0) {
          return { error: `Transaction ${txnId} not found` }
        }

        const internal = transactions.filter(t => t.source === 'internal')
        const bank = transactions.filter(t => t.source === 'bank')

        return {
          internal_records: internal,
          bank_records: bank,
        }
      }
      
      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    return { error: `Tool failed: ${error instanceof Error ? error.message : 'fetch failed'}` }
  }
}

/**
 * Intelligent mock responses based on question patterns
 */
export async function askAgent(question: string): Promise<AgentResponse> {
  const q = question.toLowerCase()
  const toolCalls: ToolCall[] = []

  // Pattern: Match rate questions
  if (q.includes('match rate') || q.includes('match') || q.includes('percentage')) {
    const result = await executeTool('get_match_rate', {})
    toolCalls.push({ name: 'get_match_rate', args: {}, result })
    
    if (result.error) {
      return {
        answer: `I couldn't retrieve the match rate. ${result.error}`,
        tool_calls: toolCalls,
      }
    }

    const matchRate = (result.match_rate * 100).toFixed(1)
    return {
      answer: `Based on the latest reconciliation run, the current match rate is **${matchRate}%**. Out of ${result.total_records} total records, ${result.matched_count} transactions matched successfully between the internal ledger and bank records. There are ${result.total_records - result.matched_count} exceptions that require attention.`,
      tool_calls: toolCalls,
    }
  }

  // Pattern: Timing lag questions
  if (q.includes('timing') || q.includes('lag') || q.includes('settlement')) {
    const result = await executeTool('get_exceptions', { type: 'timing_lag' })
    toolCalls.push({ name: 'get_exceptions', args: { type: 'timing_lag' }, result })
    
    if (result.error) {
      return {
        answer: `I couldn't retrieve timing lag exceptions. ${result.error}`,
        tool_calls: toolCalls,
      }
    }

    const timingExceptions = result.exceptions || []
    if (timingExceptions.length === 0) {
      return {
        answer: 'There are no timing lag exceptions in the current reconciliation run.',
        tool_calls: toolCalls,
      }
    }
    
    const exampleIds = timingExceptions.slice(0, 3).map((e: any) => e.internal_txn_id).join(', ')
    return {
      answer: `There are **${timingExceptions.length} timing lag exceptions** where transactions took longer than expected to settle. These involve transactions like ${exampleIds}. Timing lag occurs when a transaction appears in the ledger on one date but settles in the bank account 1-2 days later.`,
      tool_calls: toolCalls,
    }
  }

  // Pattern: Specific transaction questions
  const txnMatch = q.match(/txn\d+/i)
  if (txnMatch) {
    const txnId = txnMatch[0].toUpperCase()
    const result = await executeTool('get_transaction', { txn_id: txnId })
    toolCalls.push({ name: 'get_transaction', args: { txn_id: txnId }, result })
    
    if (result.error) {
      return {
        answer: `I couldn't find transaction ${txnId} in the system. ${result.error}`,
        tool_calls: toolCalls,
      }
    }

    const internal = result.internal_records?.[0]
    const bank = result.bank_records?.[0]

    if (!internal && !bank) {
      return {
        answer: `Transaction ${txnId} was not found in either the internal ledger or bank records.`,
        tool_calls: toolCalls,
      }
    }

    if (!internal) {
      return {
        answer: `Transaction **${txnId}** appears in the bank records (₹${bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) but is **missing from the internal ledger**. This could indicate an unrecorded transaction.`,
        tool_calls: toolCalls,
      }
    }

    if (!bank) {
      return {
        answer: `Transaction **${txnId}** appears in the internal ledger (₹${internal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}) but is **missing from bank records**. This could indicate a settlement delay or failed transaction.`,
        tool_calls: toolCalls,
      }
    }

    if (internal.amount !== bank.amount) {
      const diff = Math.abs(internal.amount - bank.amount)
      return {
        answer: `Transaction **${txnId}** has an **amount mismatch**. The ledger shows ₹${internal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, while the bank shows ₹${bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} — a difference of ₹${diff.toFixed(2)}. This discrepancy needs to be investigated.`,
        tool_calls: toolCalls,
      }
    }

    return {
      answer: `Transaction **${txnId}** appears in both the ledger and bank records with matching amounts of ₹${internal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Date: ${internal.date}, Merchant: ${internal.merchant_id}.`,
      tool_calls: toolCalls,
    }
  }

  // Pattern: Exception type questions
  const exceptionTypes = ['amount_mismatch', 'missing_in_bank', 'missing_in_ledger', 'duplicate', 'fee_mismatch']
  for (const type of exceptionTypes) {
    if (q.includes(type.replace('_', ' ')) || q.includes(type)) {
      const result = await executeTool('get_exceptions', { type })
      toolCalls.push({ name: 'get_exceptions', args: { type }, result })
      
      if (result.error) {
        return {
          answer: `I couldn't retrieve ${type.replace('_', ' ')} exceptions. ${result.error}`,
          tool_calls: toolCalls,
        }
      }

      return {
        answer: `There are **${result.count || 0} ${type.replace('_', ' ')} exceptions** in the current reconciliation run.`,
        tool_calls: toolCalls,
      }
    }
  }

  // Pattern: General exception questions
  if (q.includes('exception') || q.includes('error') || q.includes('problem') || q.includes('issue')) {
    const result = await executeTool('get_exceptions', {})
    toolCalls.push({ name: 'get_exceptions', args: {}, result })
    
    if (result.error) {
      return {
        answer: `I couldn't retrieve exceptions. ${result.error}`,
        tool_calls: toolCalls,
      }
    }

    return {
      answer: `There are **${result.count} total exceptions** across all types. You can filter by specific exception types in the table to investigate each category.`,
      tool_calls: toolCalls,
    }
  }

  // Default: Can't answer
  return {
    answer: "I don't have that information. I can help you with questions about match rates, exceptions, and specific transactions. Try asking:\n• What is the current match rate?\n• How many timing lag exceptions are there?\n• Tell me about transaction TXN0046",
    tool_calls: [],
  }
}
