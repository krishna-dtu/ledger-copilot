/**
 * List available Gemini models
 */

import { config } from 'dotenv'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Load .env.local
config({ path: '.env.local' })

async function listModels() {
  console.log('Listing available Gemini models...\n')
  
  const apiKey = process.env.GEMINI_API_KEY
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found')
    process.exit(1)
  }
  
  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    
    // Try with the newer model name
    const modelNames = [
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-pro',
      'gemini-1.5-flash-latest'
    ]
    
    for (const modelName of modelNames) {
      try {
        console.log(`Testing model: ${modelName}`)
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent('Say "ok"')
        const text = result.response.text()
        console.log(`✅ ${modelName} works! Response: ${text}\n`)
      } catch (err) {
        console.log(`❌ ${modelName} failed: ${err instanceof Error ? err.message : err}\n`)
      }
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

listModels()
