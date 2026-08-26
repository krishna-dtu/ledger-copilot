/**
 * Test Gemini API key validity
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Load .env.local
config({ path: '.env.local' })

async function testGeminiKey() {
  console.log('Testing Gemini API Key...\n')
  
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in environment')
    process.exit(1)
  }
  
  console.log(`API Key format: ${apiKey.substring(0, 10)}...`)
  console.log(`API Key length: ${apiKey.length}\n`)
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' })
    
    console.log('Attempting to generate content...')
    const result = await model.generateContent('Say "test successful" if you can read this.')
    const response = result.response
    const text = response.text()
    
    console.log('✅ Success! Gemini API is working\n')
    console.log('Response:', text)
  } catch (error) {
    console.error('❌ Gemini API Error:\n')
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('\nStack:', error.stack)
    } else {
      console.error(error)
    }
    
    console.log('\n📝 Common issues:')
    console.log('1. Invalid API key format (should start with "AIza...")')
    console.log('2. API key not activated or expired')
    console.log('3. Gemini API not enabled in Google Cloud Console')
    console.log('4. Network/firewall blocking requests to generativelanguage.googleapis.com')
    console.log('\nGet a valid API key at: https://aistudio.google.com/apikey')
  }
}

testGeminiKey()
