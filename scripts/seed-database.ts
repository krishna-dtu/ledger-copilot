/**
 * Seed database with synthetic transaction data
 * Run with: npx tsx scripts/seed-database.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import { generateSyntheticData } from '../lib/data/synthetic-generator'

// Load .env.local
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  console.log('='.repeat(80))
  console.log('SEEDING DATABASE WITH SYNTHETIC DATA')
  console.log('='.repeat(80))
  console.log()

  // Generate synthetic data
  const { internal, bank } = generateSyntheticData()
  
  console.log(`Generated ${internal.length} internal transactions`)
  console.log(`Generated ${bank.length} bank transactions`)
  console.log()

  // Clear existing data
  console.log('Clearing existing transactions...')
  const { error: deleteError } = await supabase
    .from('ledger_transactions')
    .delete()
    .neq('id', 0) // Delete all

  if (deleteError) {
    console.error('Error clearing transactions:', deleteError.message)
    process.exit(1)
  }

  // Insert internal transactions
  console.log('Inserting internal transactions...')
  const internalRecords = internal.map(t => ({
    txn_id: t.txn_id,
    amount: t.amount,
    fee: t.fee,
    date: t.date,
    merchant_id: t.merchant_id,
    source: 'internal',
  }))

  const { error: internalError } = await supabase
    .from('ledger_transactions')
    .insert(internalRecords)

  if (internalError) {
    console.error('Error inserting internal transactions:', internalError.message)
    process.exit(1)
  }

  // Insert bank transactions
  console.log('Inserting bank transactions...')
  const bankRecords = bank.map(t => ({
    txn_id: t.txn_id,
    amount: t.amount,
    fee: t.fee,
    date: t.date,
    merchant_id: t.merchant_id,
    source: 'bank',
  }))

  const { error: bankError } = await supabase
    .from('ledger_transactions')
    .insert(bankRecords)

  if (bankError) {
    console.error('Error inserting bank transactions:', bankError.message)
    process.exit(1)
  }

  console.log()
  console.log('✓ Database seeded successfully!')
  console.log()
  console.log('Summary:')
  console.log(`  Internal transactions: ${internal.length}`)
  console.log(`  Bank transactions: ${bank.length}`)
  console.log(`  Total records: ${internal.length + bank.length}`)
  console.log()
  console.log('='.repeat(80))
}

seed().catch(console.error)
