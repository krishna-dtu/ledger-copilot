/**
 * Test the Gemini Q&A agent with sample questions
 * Run with: npx tsx scripts/test-agent.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const API_URL = 'http://localhost:3000'

async function askQuestion(question: string) {
  console.log('\n' + '='.repeat(80))
  console.log('QUESTION:', question)
  console.log('='.repeat(80))
  
  const response = await fetch(`${API_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
  
  if (!response.ok) {
    console.error('Error:', response.statusText)
    return
  }
  
  const data = await response.json()
  
  console.log('\nTOOL CALLS MADE:')
  if (data.tool_calls && data.tool_calls.length > 0) {
    data.tool_calls.forEach((call: any, index: number) => {
      console.log(`\n  ${index + 1}. ${call.name}(${JSON.stringify(call.args)})`)
      console.log(`     Result: ${JSON.stringify(call.result).substring(0, 200)}...`)
    })
  } else {
    console.log('  (no tool calls made)')
  }
  
  console.log('\nANSWER:')
  console.log(data.answer)
  console.log()
}

async function main() {
  console.log('Testing Gemini Q&A Agent')
  console.log('Make sure the dev server is running on http://localhost:3000')
  console.log()
  
  // Question 1: Requires get_match_rate tool
  await askQuestion('What is the current match rate?')
  
  // Question 2: Requires get_exceptions + get_transaction tools
  await askQuestion('Tell me about transaction TXN0046. What went wrong?')
  
  // Question 3: Requires get_exceptions with filter
  await askQuestion('How many timing lag exceptions are there?')
  
  // Question 4: Should fail gracefully (no tool can answer this)
  await askQuestion('What was the match rate last month?')
  
  console.log('='.repeat(80))
  console.log('Test complete!')
  console.log('='.repeat(80))
}

main().catch(console.error)
