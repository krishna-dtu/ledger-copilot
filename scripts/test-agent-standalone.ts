/**
 * Standalone test of Gemini agent with mock tool execution
 */

import { config } from 'dotenv'
import { GoogleGenAI } from '@google/genai'

config({ path: '.env.local' })

const SYSTEM_INSTRUCTIONS = `You are a Settlement Reconciliation Assistant. Your role is to answer questions about transaction reconciliation results by querying the reconciliation system.

CRITICAL RULES:
1. You MUST call a tool before stating any number, transaction ID, amount, or match rate
2. NEVER make up or estimate figures - only report what tools return
3. Always cite the specific transaction ID(s) when discussing individual transactions

AVAILABLE TOOLS:
- get_match_rate: Get overall reconciliation statistics
- get_exceptions: Get list of exceptions/discrepancies
- get_transaction: Get detailed information about a specific transaction`

const tools = [
  {
    type: 'function',
    name: 'get_match_rate',
    description: 'Get overall reconciliation match rate and statistics',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    type: 'function',
    name: 'get_exceptions',
    description: 'Get list of reconciliation exceptions',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Filter by exception type',
          enum: ['missing_in_ledger', 'missing_in_bank', 'amount_mismatch', 'fee_mismatch', 'duplicate', 'timing_lag'],
        },
      },
    },
  },
  {
    type: 'function',
    name: 'get_transaction',
    description: 'Get details about a specific transaction',
    parameters: {
      type: 'object',
      properties: {
        txn_id: {
          type: 'string',
          description: 'Transaction ID',
        },
      },
      required: ['txn_id'],
    },
  },
]

function mockExecuteTool(toolName: string, args: Record<string, any>): any {
  console.log(`  📞 Tool called: ${toolName}(${JSON.stringify(args)})`)
  
  switch (toolName) {
    case 'get_match_rate':
      return { total_records: 134, matched_count: 106, match_rate: 0.791 }
    
    case 'get_exceptions':
      if (args.type === 'timing_lag') {
        return { count: 3, exceptions: [
          { id: 8, type: 'timing_lag', internal_txn_id: 'TXN0063', bank_txn_id: 'TXN0064' },
          { id: 9, type: 'timing_lag', internal_txn_id: 'TXN0065', bank_txn_id: 'TXN0066' },
          { id: 10, type: 'timing_lag', internal_txn_id: 'TXN0067', bank_txn_id: 'TXN0068' },
        ]}
      }
      return { count: 20, exceptions: [] }
    
    case 'get_transaction':
      if (args.txn_id === 'TXN0046') {
        return {
          txn_id: 'TXN0046',
          exists_in_internal: true,
          exists_in_bank: true,
          internal_records: [{ txn_id: 'TXN0046', amount: 2172, date: '2026-08-15' }],
          bank_records: [{ txn_id: 'TXN0046', amount: 2137, date: '2026-08-15' }],
        }
      }
      return { error: 'Transaction not found' }
    
    default:
      return { error: 'Unknown tool' }
  }
}

async function testAgent() {
  console.log('Testing Gemini Agent with new @google/genai SDK\n')
  
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found')
    process.exit(1)
  }

  console.log('Creating client...')
  const client = new GoogleGenAI({ apiKey })

  const question = 'What is the current match rate?'
  console.log(`Question: ${question}\n`)

  try {
    console.log('Creating interaction...')
    let interaction = await client.interactions.create({
      model: 'gemini-3.6-flash',
      store: false,
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
      tools: tools as any,
    })

    let history: any[] = [
      { type: 'user_input', content: [{ type: 'text', text: SYSTEM_INSTRUCTIONS }] },
      { type: 'user_input', content: [{ type: 'text', text: question }] }
    ]

    history.push(...interaction.steps)

    // Handle function calls
    let maxIterations = 5
    let iterations = 0

    while (iterations < maxIterations) {
      const functionCallSteps = interaction.steps.filter((step: any) => step.type === 'function_call')
      
      if (functionCallSteps.length === 0) {
        break
      }

      for (const fcStep of functionCallSteps) {
        const result = mockExecuteTool(fcStep.name, fcStep.arguments || {})
        console.log(`  ✅ Result: ${JSON.stringify(result)}\n`)

        history.push({
          type: 'function_result',
          name: fcStep.name,
          call_id: fcStep.id,
          result: [{ type: 'text', text: JSON.stringify(result) }],
        })
      }

      interaction = await client.interactions.create({
        model: 'gemini-3.6-flash',
        store: false,
        input: history,
        tools: tools as any,
      })

      history.push(...interaction.steps)
      iterations++
    }

    console.log('Final Answer:')
    console.log(interaction.output_text || 'No response')
    console.log('\n✅ Agent test successful!')

  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

testAgent()
