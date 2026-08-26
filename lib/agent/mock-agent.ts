/**
 * Mock AI Agent - Returns realistic responses without API calls
 * Use this for demo purposes when API quotas are exceeded
 */

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
 * Execute a tool call by making HTTP request to the corresponding API route
 */
async function executeTool(toolName: string, args: Record<string, any>): Promise<any> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  
  try {
    switch (toolName) {
      case 'get_match_rate': {
        const response = await fetch(`${baseUrl}/api/reconcile`)
        if (!response.ok) return { error: 'Failed to fetch match rate' }
        const data = await response.json()
        return {
          total_records: data.total_records,
          matched_count: data.matched_count,
          match_rate: data.match_rate,
        }
      }
      
      case 'get_exceptions': {
        const params = new URLSearchParams()
        if (args.type) params.append('type', args.type)
        if (args.run_id) params.append('run_id', args.run_id.toString())
        const response = await fetch(`${baseUrl}/api/exceptions?${params.toString()}`)
        if (!response.ok) return { error: 'Failed to fetch exceptions' }
        return await response.json()
      }
      
      case 'get_transaction': {
        const response = await fetch(`${baseUrl}/api/transaction/${args.txn_id}`)
        if (!response.ok) return { error: `Transaction ${args.txn_id} not found` }
        return await response.json()
      }
      
      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    return { error: `Tool failed: ${error instanceof Error ? error.message : 'Unknown'}` }
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

    if (internal && bank && internal.amount !== bank.amount) {
      const diff = Math.abs(internal.amount - bank.amount)
      return {
        answer: `Transaction **${txnId}** has an **amount mismatch**. The ledger shows ₹${internal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, while the bank shows ₹${bank.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} — a difference of ₹${diff.toFixed(2)}. This discrepancy needs to be investigated.`,
        tool_calls: toolCalls,
      }
    }

    return {
      answer: `Transaction ${txnId} appears in both the ledger and bank records with matching amounts of ₹${internal.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`,
      tool_calls: toolCalls,
    }
  }

  // Pattern: Exception type questions
  const exceptionTypes = ['amount_mismatch', 'missing_in_bank', 'missing_in_ledger', 'duplicate', 'fee_mismatch']
  for (const type of exceptionTypes) {
    if (q.includes(type.replace('_', ' ')) || q.includes(type)) {
      const result = await executeTool('get_exceptions', { type })
      toolCalls.push({ name: 'get_exceptions', args: { type }, result })
      
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
