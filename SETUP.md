# Ledger Copilot - Setup Instructions

## Phase 4: Database Schema Setup

Since I don't have permission to create tables programmatically, please follow these steps to set up the Supabase database schema:

### Step 1: Create Database Tables

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rdkqakwtqwowzdfqeejw
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the contents of `lib/db/schema.sql` and paste it into the SQL editor
5. Click "Run" to execute the SQL and create the tables

### Step 2: Verify Tables Were Created

Run this query in the SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ledger_transactions', 'reconciliation_runs', 'exceptions');
```

You should see all 3 tables listed.

### Step 3: Seed Database with Synthetic Data

Once the tables are created, run:

```bash
npx tsx scripts/seed-database.ts
```

This will populate the database with synthetic transaction data.

### Step 4: Start the Development Server

```bash
npm run dev
```

### Step 5: Test API Endpoints

Once the server is running (http://localhost:3000), test the endpoints:

**POST /api/reconcile** - Run reconciliation:
```bash
curl -X POST http://localhost:3000/api/reconcile
```

**GET /api/exceptions** - Get all exceptions:
```bash
curl http://localhost:3000/api/exceptions
```

**GET /api/exceptions?type=amount_mismatch** - Filter by type:
```bash
curl "http://localhost:3000/api/exceptions?type=amount_mismatch"
```

**GET /api/transaction/TXN0001** - Get specific transaction:
```bash
curl http://localhost:3000/api/transaction/TXN0001
```

---

## What to Show Me for Verification

Once you've completed the setup:

1. **Schema verification** - Run this SQL and paste the output:
```sql
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('ledger_transactions', 'reconciliation_runs', 'exceptions')
ORDER BY table_name, ordinal_position;
```

2. **API test outputs** - Run each curl command above and paste the actual JSON responses

3. **Record count** - Run this SQL and paste the output:
```sql
SELECT 
  source,
  COUNT(*) as count
FROM ledger_transactions
GROUP BY source;
```
