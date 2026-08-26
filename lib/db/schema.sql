-- Ledger Copilot Database Schema
-- Run this in Supabase SQL Editor to create the tables

-- Table 1: ledger_transactions
-- Stores all transaction records from both internal ledger and bank statements
CREATE TABLE IF NOT EXISTS ledger_transactions (
  id BIGSERIAL PRIMARY KEY,
  txn_id TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fee DECIMAL(15, 2) NOT NULL,
  date DATE NOT NULL,
  merchant_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('internal', 'bank')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_txn_id ON ledger_transactions(txn_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transactions_source ON ledger_transactions(source);

-- Table 2: reconciliation_runs
-- Stores metadata for each reconciliation execution
CREATE TABLE IF NOT EXISTS reconciliation_runs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_records INTEGER NOT NULL,
  matched_count INTEGER NOT NULL,
  match_rate DECIMAL(6, 4) NOT NULL
);

-- Table 3: exceptions
-- Stores all reconciliation exceptions/discrepancies
CREATE TABLE IF NOT EXISTS exceptions (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('missing_in_ledger', 'missing_in_bank', 'amount_mismatch', 'fee_mismatch', 'duplicate', 'timing_lag')),
  internal_txn_id TEXT,
  bank_txn_id TEXT,
  detail TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_exceptions_run_id ON exceptions(run_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_type ON exceptions(type);
CREATE INDEX IF NOT EXISTS idx_exceptions_resolved ON exceptions(resolved);

-- Comments for documentation
COMMENT ON TABLE ledger_transactions IS 'All transaction records from internal ledger and bank statements';
COMMENT ON TABLE reconciliation_runs IS 'Metadata for each reconciliation execution';
COMMENT ON TABLE exceptions IS 'Reconciliation discrepancies and exceptions';
