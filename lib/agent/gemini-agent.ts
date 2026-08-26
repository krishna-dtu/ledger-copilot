/**
 * Gemini Q&A Agent with function calling using new @google/genai SDK
 * The agent MUST call tools before stating any numbers or transaction IDs
 */

import { GoogleGenAI } from '@google/genai'

const SYSTEM_INSTRUCTIONS = `You are a Settlement Reconciliation Assistant. Your role is to answer questions about transaction reconciliation results by querying the reconciliation system.

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
 * Process a user question through the Gemini agent
 */
export async function askAgent(question: string): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found')
  }

  const client = new GoogleGenAI({ apiKey })
  const toolCalls: ToolCall[] = []

  // Tool definitions imported from gemini-tools
  const { tools } = await import('./gemini-tools')

  // Create initial interaction with system instructions as first message
  let interaction = await client.interactions.create({
    model: 'gemini-1.5-flash-latest',
    store: false,  // Stateless mode
    input: [
      {
        type: 'user_input',
        content: [{ type: 'text', text: SYSTEM_INSTRUCTIONS }]
      },
      {
        type: 'user_input',
        content: [{ type: 'text', text: question }]
      }
    ],
    tools: tools,
  })

  let history: any[] = [
    {
      type: 'user_input',
      content: [{ type: 'text', text: SYSTEM_INSTRUCTIONS }]
    },
    {
      type: 'user_input',
      content: [{ type: 'text', text: question }]
    }
  ]

  // Add all steps from the interaction to history
  history.push(...interaction.steps)

  // Handle function calls iteratively
  let maxIterations = 10
  let iterations = 0

  while (iterations < maxIterations) {
    const functionCallSteps = interaction.steps.filter(step => step.type === 'function_call')
    
    if (functionCallSteps.length === 0) {
      // No more function calls, we're done
      break
    }

    // Execute all function calls
    for (const fcStep of functionCallSteps) {
      const toolResult = await executeTool(fcStep.name, fcStep.arguments || {})
      
      // Log the tool call
      toolCalls.push({
        name: fcStep.name,
        args: fcStep.arguments || {},
        result: toolResult,
      })

      // Add function result to history
      history.push({
        type: 'function_result',
        name: fcStep.name,
        call_id: fcStep.id,
        result: [{ type: 'text', text: JSON.stringify(toolResult) }],
      })
    }

    // Send function results back to the model
    interaction = await client.interactions.create({
      model: 'gemini-1.5-flash-latest',
      store: false,
      input: history,
      tools: tools,
    })

    // Add new steps to history
    history.push(...interaction.steps)
    iterations++
  }

  // Extract final text response
  const answer = interaction.output_text || 'I was unable to generate a response.'

  return {
    answer,
    tool_calls: toolCalls,
  }
}
