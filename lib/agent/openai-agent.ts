/**
 * OpenAI Q&A Agent with function calling
 * The agent MUST call tools before stating any numbers or transaction IDs
 */

import OpenAI from 'openai'
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions'

const SYSTEM_PROMPT = `You are a Settlement Reconciliation Assistant. Your role is to answer questions about transaction reconciliation results by querying the reconciliation system.

CRITICAL RULES:
1. You MUST call a tool before stating any number, transaction ID, amount, or match rate
2. NEVER make up or estimate figures - only report what tools return
3. Always cite the specific transaction ID(s) when discussing individual transactions
4. If a question cannot be answered with your available tools, say "I don't have that information" rather than guessing
5. Format currency amounts in Indian Rupees with proper formatting (₹X,XXX.XX)
6. When discussing exceptions, always include the transaction IDs involved

AVAILABLE TOOLS:
- get_match_rate: Get overall reconciliation statistics (total records, matched count, match rate)
- get_exceptions: Get list of exceptions/discrepancies, optionally filtered by type
- get_transaction: Get detailed information about a specific transaction by ID

You must call these tools to retrieve data. Do not state any figures that did not come from a tool call result.`

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
        const response = await fetch(`${baseUrl}/api/reconcile`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        })
        
        if (!response.ok) {
          return { error: 'Failed to fetch match rate' }
        }
        
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
        
        if (!response.ok) {
          return { error: 'Failed to fetch exceptions' }
        }
        
        return await response.json()
      }
      
      case 'get_transaction': {
        const response = await fetch(`${baseUrl}/api/transaction/${args.txn_id}`)
        
        if (!response.ok) {
          return { error: `Transaction ${args.txn_id} not found` }
        }
        
        return await response.json()
      }
      
      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    return { error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

/**
 * OpenAI function definitions
 */
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_exceptions',
      description: 'Retrieves reconciliation exceptions/discrepancies. Can filter by exception type. Use this to answer questions about what went wrong, which transactions failed to match, or to count exceptions by type.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Optional filter by exception type. Valid values: missing_in_ledger, missing_in_bank, amount_mismatch, fee_mismatch, duplicate, timing_lag. Omit to get all exceptions.',
            enum: ['missing_in_ledger', 'missing_in_bank', 'amount_mismatch', 'fee_mismatch', 'duplicate', 'timing_lag'],
          },
          run_id: {
            type: 'number',
            description: 'Optional filter by reconciliation run ID. Omit to get exceptions from the latest run.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transaction',
      description: 'Retrieves detailed information about a specific transaction by its transaction ID. Shows whether it exists in internal ledger, bank records, or both, along with full transaction details (amount, fee, date, merchant). Use this to investigate specific transactions mentioned in exceptions.',
      parameters: {
        type: 'object',
        properties: {
          txn_id: {
            type: 'string',
            description: 'The transaction ID to look up (e.g., TXN0001)',
          },
        },
        required: ['txn_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_match_rate',
      description: 'Retrieves the overall reconciliation match rate and summary statistics from the latest reconciliation run. Returns total records processed, how many matched, and the match rate percentage. Use this to answer questions about overall reconciliation health or success rate.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
]

/**
 * Process a user question through the OpenAI agent
 */
export async function askAgent(question: string): Promise<AgentResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not found')
  }

  const openai = new OpenAI({ apiKey })
  const toolCalls: ToolCall[] = []

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ]

  let maxIterations = 10
  let iterations = 0

  while (iterations < maxIterations) {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      tools: tools,
      tool_choice: 'auto',
    })

    const message = response.choices[0].message

    // Check if the model wants to call functions
    if (message.tool_calls && message.tool_calls.length > 0) {
      // Add assistant's message with tool calls to history
      messages.push(message)

      // Execute all tool calls
      for (const toolCall of message.tool_calls) {
        // Type guard to ensure we have a function tool call
        if (toolCall.type !== 'function' || !toolCall.function) {
          continue
        }

        const functionName = toolCall.function.name
        const functionArgs = JSON.parse(toolCall.function.arguments)

        const result = await executeTool(functionName, functionArgs)

        // Log the tool call
        toolCalls.push({
          name: functionName,
          args: functionArgs,
          result: result,
        })

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      iterations++
    } else {
      // No more tool calls, return final answer
      const answer = message.content || 'I was unable to generate a response.'

      return {
        answer,
        tool_calls: toolCalls,
      }
    }
  }

  // Max iterations reached
  return {
    answer: 'I apologize, but I reached the maximum number of processing steps. Please try rephrasing your question.',
    tool_calls: toolCalls,
  }
}
