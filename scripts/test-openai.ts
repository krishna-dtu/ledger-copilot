/**
 * Test OpenAI agent
 */

import { config } from 'dotenv'
import OpenAI from 'openai'

config({ path: '.env.local' })

async function test() {
  console.log('Testing OpenAI connection...\n')
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey || apiKey === 'your-openai-api-key-here') {
    console.error('❌ OPENAI_API_KEY not set in .env.local')
    console.log('\nPlease update .env.local with your OpenAI API key:')
    console.log('OPENAI_API_KEY=sk-...')
    process.exit(1)
  }

  console.log(`API Key format: ${apiKey.substring(0, 10)}...`)
  console.log(`API Key length: ${apiKey.length}\n`)

  try {
    const openai = new OpenAI({ apiKey })
    
    console.log('Sending test message...')
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say "OpenAI is working!" if you can read this.' }
      ],
    })

    const answer = response.choices[0].message.content

    console.log('\n✅ Success! OpenAI is connected\n')
    console.log('Response:', answer)
    console.log('\nYou can now use the agent in your dashboard!')

  } catch (error) {
    console.error('\n❌ Error:\n')
    if (error instanceof Error) {
      console.error('Message:', error.message)
    } else {
      console.error(error)
    }
    console.log('\nMake sure you have:')
    console.log('1. A valid OpenAI API key from https://platform.openai.com/api-keys')
    console.log('2. The key set in .env.local as OPENAI_API_KEY=sk-...')
    process.exit(1)
  }
}

test()
