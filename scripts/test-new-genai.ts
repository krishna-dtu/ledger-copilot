/**
 * Test new @google/genai SDK with AQ. key format
 */

import { config } from 'dotenv'
import { GoogleGenAI } from '@google/genai'

// Load .env.local
config({ path: '.env.local' })

async function testNewSDK() {
  console.log('Testing new @google/genai SDK...\n')
  
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found')
    process.exit(1)
  }
  
  console.log(`API Key format: ${apiKey.substring(0, 10)}...`)
  console.log(`API Key length: ${apiKey.length}\n`)
  
  try {
    const genAI = new GoogleGenAI({ apiKey })
    
    console.log('Sending "hello" test message...')
    const response = await genAI.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Say "hello, auth works!"'
    })
    
    console.log('\n✅ Success! Auth working with new SDK\n')
    console.log('Response:', response.text)
  } catch (error) {
    console.error('\n❌ Error:\n')
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('\nStack:', error.stack)
    } else {
      console.error(error)
    }
  }
}

testNewSDK()
