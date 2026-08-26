/**
 * Simplified Gemini agent using generateContent API (higher rate limits)
 */

import { GoogleGenAI } from '@google/genai'

const SYSTEM_INSTRUCTIONS = `You are a Settlement Reconciliation Assistant. You answer questions by calling tools.

RULES:
1. ALWAYS call a tool before stating any number or transaction ID
2. NEVER make up data - only use tool results
3. Cite transaction IDs when discussing transactions
4. Say "I don't have that information" if you can't answer

TOOLS:
- get_match_rate: Get reconciliation statistics
- get_exceptions: Get exception list (can filter by type)
- get_transaction: Get transaction details by ID`

interface ToolCall {
  name: string
  args: Record<string, any>
  result: any
}

export interface AgentResponse {
  answer: string
  tool_calls: ToolCall[]
}

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

export async function askAgent(question: string): Promise<AgentResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not found')

  const client = new GoogleGenAI({ apiKey })
  const toolCalls: ToolCall[] = []

  const { tools } = await import('./gemini-tools')

  // Use generateContent with tools (simpler, higher rate limits)
  let result = await client.models.generateContent({
    model: 'gemini-1.5-flash-latest',
    contents: [{
      role: 'user',
      parts: [{ text: `${SYSTEM_INSTRUCTIONS}\n\nUser question: ${question}` }]
    }],
    tools: tools as any,
  })

  let maxTurns = 10
  let turns = 0

  // Handle function calls
  while (turns < maxTurns) {
    const functionCalls = result.candidates?.[0]?.content?.parts?.filter((part: any) => part.functionCall) || []
    
    if (functionCalls.length === 0) break

    // Execute all function calls
    const functionResponses = []
    
    for (const part of functionCalls) {
      const fc = part.functionCall
      const toolResult = await executeTool(fc.name, fc.args || {})
      
      toolCalls.push({
        name: fc.name,
        args: fc.args || {},
        result: toolResult,
      })

      functionResponses.push({
        functionResponse: {
          name: fc.name,
          response: toolResult,
        }
      })
    }

    // Send results back
    result = await client.models.generateContent({
      model: 'gemini-1.5-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_INSTRUCTIONS}\n\nUser question: ${question}` }]
        },
        result.candidates[0].content,
        {
          role: 'user',
          parts: functionResponses
        }
      ],
      tools: tools as any,
    })

    turns++
  }

  const answer = result.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || 
                 'Unable to generate response'

  return { answer, tool_calls: toolCalls }
}
