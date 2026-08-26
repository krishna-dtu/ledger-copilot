/**
 * Simple test of function calling without interactions API
 */

import { config } from 'dotenv'
import { GoogleGenAI } from '@google/genai'

config({ path: '.env.local' })

const tool = {
  type: 'function',
  name: 'get_weather',
  description: 'Get weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string', description: 'City name' },
    },
    required: ['location'],
  },
}

async function test() {
  console.log('Testing simple function calling...\n')
  
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found')
    process.exit(1)
  }

  const client = new GoogleGenAI({ apiKey })

  try {
    console.log('Sending request with tool...')
    
    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: "What's the weather in Paris?",
      tools: [tool as any],
    })

    console.log('\n✅ Response received:')
    console.log(JSON.stringify(response, null, 2))

  } catch (error) {
    console.error('\n❌ Error:')
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    } else {
      console.error(error)
    }
    process.exit(1)
  }
}

test()
