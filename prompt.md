# Ledger Copilot — Project Brief for Kiro

## Context (paste this whole file into Kiro at project start, or split into
## .kiro/steering/product.md, tech.md, structure.md)

This is a submission for the **Razorpay AI Buildathon 2026 — Track 04: AI Finance Controller**.
Razorpay's stated bar for this track: *"close one finance-ops loop across a 50+ record batch
of synthetic data, reporting its match rate and the exceptions it could not resolve."* They
explicitly warn: *"one cherry-picked match proves nothing."* Every decision below exists to
satisfy that bar honestly, not to look impressive superficially.

## Product

**Name:** Ledger Copilot
**One-line pitch:** A settlement reconciliation agent that matches two transaction sources,
reports an honest match rate with a typed exception list, and answers natural-language
questions about *why* a settlement didn't balance — grounded entirely in its own computed
output, never in free-form LLM guessing.

**Non-negotiable design principle:** The LLM must NEVER state a number, transaction ID, or
conclusion that didn't come from a tool call against the reconciliation engine. It is a
narrator over verified data, not a reasoner over raw data. This is the single most important
architectural decision in this project — treat any deviation from it as a bug.

## Tech stack

- Next.js 14, App Router, TypeScript
- Tailwind CSS, Recharts for the match-rate chart
- Supabase (Postgres) for storing transactions, reconciliation runs, and exceptions
- Gemini API with function calling for the Settlement Q&A agent
- Vitest for unit tests on the matching logic
- Deployed on Vercel

## Data model (Supabase tables)

- `ledger_transactions`: id, txn_id, amount, fee, date, merchant_id, source ('internal' | 'bank')
- `reconciliation_runs`: id, created_at, total_records, matched_count, match_rate
- `exceptions`: id, run_id, type ('missing_in_ledger' | 'missing_in_bank' | 'amount_mismatch' |
  'fee_mismatch' | 'duplicate' | 'timing_lag'), internal_txn_id (nullable), bank_txn_id (nullable),
  detail (text explanation), resolved (boolean, default false)

## Functional requirements, in build order

### 1. Synthetic data generator
Generate 60-80 paired transactions across both sources. Deliberately inject: ~5 amount
mismatches (fee calculation errors), ~5 missing-in-ledger, ~5 missing-in-bank, 2 duplicates,
3 timing-lag entries (same txn, bank settles 1-2 days after ledger date). Realism in the
failure modes matters more than volume — these should look like genuine settlement bugs,
not random noise.

### 2. Reconciliation engine (core logic — get this right first)
- Pass 1: exact match by `txn_id`.
- Pass 2: for unmatched records, fuzzy match by amount (within ₹1 tolerance) and date
  (within a 2-day window) to catch timing-lag cases.
- Anything still unmatched becomes a typed exception with a human-readable `detail` string
  explaining what's wrong (e.g. "Internal shows ₹4,500.00, bank shows ₹4,487.50 — fee
  miscalculated by ₹12.50").
- Output: `match_rate = matched_count / total_records`, plus the full exception list.
- Write unit tests for each exception type using hand-crafted fixture pairs — this is
  the part of the project most worth testing.

### 3. API layer
- `POST /api/reconcile` — runs a fresh reconciliation over the current data batch, persists
  a `reconciliation_runs` row and its `exceptions`.
- `GET /api/exceptions?type=` — filter exceptions by type.
- `GET /api/transaction/:txnId` — full record + which side(s) it appears on.
- These are the ONLY way the Q&A agent is allowed to access transaction data.

### 4. Settlement Q&A agent
- Gemini API, function-calling mode, tools bound 1:1 to the API routes above
  (`get_exceptions(type)`, `get_transaction(txn_id)`, `get_match_rate()`).
- System prompt for the agent: it must call a tool before stating any figure, and must
  cite the specific transaction ID(s) behind any claim it makes.
- Log every tool call the agent makes (visible in the dashboard) — this is the audit trail.

### 5. Dashboard (dark analyst-dashboard aesthetic — reuse the Space Grotesk / IBM Plex Mono
   / Inter type pairing and dark theme approach from the ApexSignal build)
- Top: match rate as a large stat + a simple bar/donut chart of exception types.
- Middle: filterable, sortable exception table. Clicking a row expands to show both
  conflicting records side by side.
- Side or bottom panel: chat interface for the Q&A agent, showing its tool-call trail
  inline with each answer (small "queried: get_transaction(TXN0231)" tag under the response).

### 6. Deploy
- Vercel deploy, Supabase as the hosted backend.
- Write `architecture.md`: explain the two-pass matching algorithm, the tool-calling
  guardrail design, and one real failure encountered during the build and how it was fixed.
- Write `NOTES.md` disclosing any AI tool use (what was used, roughly where) — same
  convention Razorpay/1Fi expects.

## Definition of done
- [ ] Match rate computed over 60+ real synthetic records, not hardcoded
- [ ] Every exception type has at least one real example in the data
- [ ] Q&A agent answers 3+ different question types correctly, always citing tool-call output
- [ ] Zero instances of the agent stating a number not traceable to a tool call
- [ ] Deployed, publicly reachable Vercel link
- [ ] `architecture.md` and `NOTES.md` present in repo root
- [ ] At least 5 unit tests passing on the reconciliation engine

## What NOT to do
- Do not let the LLM free-generate reconciliation logic in natural language — it must call
  the deterministic engine.
- Do not polish the UI before the matching logic is correct and tested.
- Do not hide or omit unresolved exceptions to inflate the match rate — an honest 90% beats
  a suspicious 100%.
