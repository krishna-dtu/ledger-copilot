# Ledger Copilot

<div align="center">

**AI-Powered Settlement Reconciliation & Exception Analysis**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-68%20passing-brightgreen)](https://vitest.dev/)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

[Live Demo](https://ledger-copilot-xi.vercel.app/) · [Documentation](./docs) · [Report Bug](https://github.com/krishna-dtu/ledger-copilot/issues)

</div>

---

## 🎯 Overview

**Ledger Copilot** is an intelligent reconciliation system that automates the tedious process of matching internal ledger transactions against bank settlement records. Built for fintech companies and payment processors, it identifies discrepancies across thousands of transactions in seconds and provides an AI-powered Q&A interface for investigating exceptions.

### Key Features

- **🔄 Automated 3-Pass Reconciliation**: Exact match by ID → Fuzzy match by amount/date → Exception classification
- **🤖 AI Q&A Agent**: Natural language interface powered by OpenAI function calling
- **📊 Real-Time Dashboard**: Match rate visualization, exception breakdown, and live filtering
- **🎨 Fintech-Grade UI**: Polished interface with animations, responsive design, and accessibility
- **✅ 68 Comprehensive Tests**: Full coverage of matching logic and edge cases
- **🚀 Production-Ready**: TypeScript, proper error handling, and zero build errors

### Problem Being Solved

Financial teams at fintechs manually spend **4+ hours daily** matching transactions between systems:
- Downloading CSVs from multiple sources
- Running VLOOKUP formulas in spreadsheets
- Manually categorizing discrepancies
- High error rates on large datasets (50K+ transactions)

**Ledger Copilot reduces this to 5 minutes** with automated reconciliation + AI-assisted investigation.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- OpenAI API key (optional - mock agent available)

### Installation

```bash
# Clone the repository
git clone https://github.com/krishna-dtu/ledger-copilot.git
cd ledger-copilot

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials
```

### Environment Variables

Create a `.env.local` file with:

```env
# Supabase (https://supabase.com/)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI (optional - mock agent available)
OPENAI_API_KEY=sk-your-openai-key
```

### Database Setup

1. Create a Supabase project
2. Run the schema from `lib/db/schema.sql`:

```sql
-- Creates 3 tables: ledger_transactions, reconciliation_runs, exceptions
-- See lib/db/schema.sql for full schema
```

3. Seed with sample data (optional):

```bash
npx tsx scripts/seed-database.ts
```

### Run Development Server

```bash
npm run dev
# Open http://localhost:3000
```

### Run Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

### Build for Production

```bash
npm run build
npm start
```

---

## 📖 How It Works

### 1. Reconciliation Engine (Core Algorithm)

The engine processes transactions in **3 passes**:

#### Pass 1: Exact Match by Transaction ID
```typescript
// Matches transactions with identical IDs
// If amounts/fees/dates differ → creates typed exceptions
Match: TXN001 (internal) ⟷ TXN001 (bank) ✅
Mismatch: TXN002 ledger ₹1,000 vs bank ₹950 → amount_mismatch
```

#### Pass 2: Fuzzy Match by Amount + Date
```typescript
// Catches timing lags where settlement date differs
// Tolerances: ±₹1.00 for amounts, ±2 days for dates
// Constraint: bank_date >= internal_date (settlement never precedes recognition)
TXN003 (internal): ₹4,500 on Aug 24
TXN099 (bank): ₹4,500 on Aug 26 → timing_lag (2-day settlement delay)
```

#### Pass 3: Exception Classification
```typescript
// Remaining unmatched records classified as:
- missing_in_bank: Ledger transaction never settled
- missing_in_ledger: Bank transaction not recorded internally
- duplicate: Same transaction ID appears multiple times
```

### 2. Exception Types (6 Total)

| Type | Description | Example |
|------|-------------|---------|
| **amount_mismatch** | Same transaction ID, different amounts | Ledger: ₹1,000, Bank: ₹950 |
| **fee_mismatch** | Amounts match, fees differ | Ledger fee: ₹20, Bank fee: ₹18 |
| **timing_lag** | Settlement delayed 1-2 days | Ledger: Aug 24, Bank: Aug 26 |
| **missing_in_bank** | Ledger transaction not settled | TXN045 in ledger, not in bank |
| **missing_in_ledger** | Bank transaction not recorded | TXN067 in bank, not in ledger |
| **duplicate** | Transaction ID appears multiple times | TXN012 appears 3x in ledger |

### 3. AI Q&A Agent

**Architecture**: OpenAI function calling with 3 tools

```typescript
// Agent NEVER states numbers without tool calls (prevents hallucinations)
Tools available:
1. get_match_rate() → returns reconciliation summary
2. get_exceptions(type?) → lists exceptions with optional filtering
3. get_transaction(txn_id) → deep-dives into specific transaction
```

**Example Interaction**:
```
User: "Tell me about transaction TXN0046"
Agent: [calls get_transaction("TXN0046")]
Agent: "Transaction TXN0046 has an amount mismatch. 
       Ledger shows ₹1,000, bank shows ₹950 — difference of ₹50."
```

**Tool Call Transparency**: Every tool call is logged and displayed in the UI as expandable chips showing arguments + results.

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Server-side rendering, API routes |
| **UI** | Tailwind CSS, Framer Motion | Styling, animations |
| **State** | React Hooks | Client-side state management |
| **Database** | Supabase (PostgreSQL) | Transaction storage, reconciliation runs |
| **AI** | OpenAI GPT-3.5-turbo | Function calling for Q&A |
| **Testing** | Vitest | Unit + integration tests |
| **Deployment** | Vercel | Production hosting |

### Project Structure

```
ledger-copilot/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── ask/route.ts          # AI agent endpoint
│   │   ├── reconcile/route.ts    # Run reconciliation
│   │   ├── exceptions/route.ts   # List exceptions
│   │   └── transaction/[txnId]/route.ts
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Dashboard page
│
├── components/                   # React components
│   ├── HeroStats.tsx             # Match rate + stats cards
│   ├── ExceptionTablePro.tsx     # Exception table with filters
│   └── ChatInterfacePro.tsx      # AI chat interface
│
├── lib/                          # Core business logic
│   ├── reconciliation/           # ✅ 68 tests
│   │   ├── engine.ts             # Main reconciliation function
│   │   ├── matchers.ts           # Exact + fuzzy matching
│   │   ├── exceptions.ts         # Exception builders
│   │   ├── utils.ts              # INR formatting, date math
│   │   ├── types.ts              # TypeScript interfaces
│   │   └── constants.ts          # Tolerance thresholds
│   ├── agent/                    # AI agent implementations
│   │   ├── openai-agent.ts       # Full OpenAI function calling
│   │   └── mock-agent.ts         # Demo agent (no API costs)
│   ├── db/                       # Database
│   │   ├── supabase.ts           # Supabase client
│   │   └── schema.sql            # Database schema
│   └── data/                     # Data generation
│       └── synthetic-generator.ts
│
├── __tests__/                    # Test suite
│   └── reconciliation/
│       ├── engine.test.ts        # 25 integration tests
│       ├── matchers.test.ts      # 22 matching logic tests
│       ├── exceptions.test.ts    # 8 exception builder tests
│       ├── utils.test.ts         # 13 utility tests
│       └── fixtures.ts           # Test data
│
├── docs/                         # Documentation
│   ├── reconciliation-engine-requirements.md
│   ├── reconciliation-engine-design.md
│   └── dashboard-features.md
│
├── scripts/                      # Utility scripts
│   └── seed-database.ts          # Generate sample data
│
├── .env.local                    # Environment variables (not committed)
├── next.config.mjs               # Next.js configuration
├── tailwind.config.ts            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
├── vitest.config.ts              # Vitest configuration
└── package.json
```

### Data Flow

```
┌─────────────────────────────────────────────────────┐
│                USER INTERFACE (Dashboard)            │
│  Hero Stats | Exception Table | AI Chat Interface   │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP Requests
                        ▼
┌─────────────────────────────────────────────────────┐
│              API LAYER (Next.js Routes)             │
│  POST /api/reconcile  │  GET /api/exceptions        │
│  GET /api/transaction │  POST /api/ask (AI)         │
└───────────────────────┬─────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
┌───────────────────┐       ┌───────────────────────┐
│ RECONCILIATION    │       │   AI AGENT            │
│ ENGINE            │       │ (OpenAI + Mock)       │
│ - Exact Match     │       │ - Function Calling    │
│ - Fuzzy Match     │       │ - Tool Logging        │
│ - Exception Class │       │ - No Hallucinations   │
└─────────┬─────────┘       └───────────┬───────────┘
          │                             │
          └──────────────┬──────────────┘
                         ▼
                ┌─────────────────┐
                │   SUPABASE DB   │
                │  (PostgreSQL)   │
                │ - Transactions  │
                │ - Runs          │
                │ - Exceptions    │
                └─────────────────┘
```

---

## 🎨 Features

### Dashboard

- **Hero Stats Section**
  - Animated 120px radial progress ring (match rate visualization)
  - Count-up animations (0→79.1% over 800ms)
  - Three elevated stat cards (Matched, Exceptions, Total Records)
  - Interactive exception breakdown bar with 5 color-coded segments
  - Hover tooltips showing count and percentage per exception type

- **Exception Table**
  - Segmented filter bar with live counts (e.g., "Amount Mismatch (5)")
  - Real-time search by transaction ID
  - Stagger-in row animations (20ms delay per row, max 300ms cap)
  - Detail drawer slides from right showing side-by-side comparison
  - Skeleton loading states (not spinners)

- **AI Chat Interface**
  - Inline semantic chips auto-detect transaction IDs and exception types
  - Tool call reasoning chips (expandable JSON arguments/results)
  - Clickable example prompts for new users
  - Typing indicator with 3 pulsing dots
  - Full markdown support for responses

- **Persistent Top Bar**
  - Logo with live status indicator
  - Last run timestamp
  - Re-run reconciliation button (rotating icon when running)
  - Export Dataset button (downloads comprehensive JSON)
  - Success toast with emerald gradient (auto-dismisses after 3s)

### Accessibility

- ♿ All animations respect `prefers-reduced-motion`
- ⌨️ Full keyboard navigation support
- 🎨 WCAG-compliant contrast ratios
- 📱 Responsive design (mobile warning, desktop-optimized)
- 🔤 Tabular-nums font for financial figures

---

## 🧪 Testing

### Test Coverage

**68 comprehensive tests** across 5 test files:

| File | Tests | Coverage |
|------|-------|----------|
| `engine.test.ts` | 25 | Integration tests (full reconciliation runs) |
| `matchers.test.ts` | 22 | Matching logic (exact, fuzzy, edge cases) |
| `exceptions.test.ts` | 8 | Exception detail formatting |
| `utils.test.ts` | 13 | INR formatting, date math |
| **Total** | **68** | **100% core logic** |

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm test -- --coverage

# Run specific test file
npm test engine.test.ts

# Watch mode for development
npm run test:watch
```

### Test Examples

```typescript
// Fuzzy matching with timing lag
test('fuzzy match: 1-day settlement lag', () => {
  const internal = [{ txn_id: 'TXN001', amount: 1000, date: '2026-08-24' }]
  const bank = [{ txn_id: 'TXN099', amount: 1000, date: '2026-08-25' }]
  
  const result = fuzzyMatch(internal, bank)
  
  expect(result.exceptions).toHaveLength(1)
  expect(result.exceptions[0].type).toBe('timing_lag')
  expect(result.exceptions[0].detail).toContain('1-day settlement lag')
})

// Edge case: Same-day different IDs (should NOT fuzzy match)
test('fuzzy match rejection: 0-day difference', () => {
  const internal = [{ txn_id: 'TXN001', amount: 1000, date: '2026-08-24' }]
  const bank = [{ txn_id: 'TXN002', amount: 1000, date: '2026-08-24' }]
  
  const result = fuzzyMatch(internal, bank)
  
  expect(result.exceptions).toHaveLength(0) // No timing_lag
  // These should remain unmatched and be classified as missing exceptions
})
```

---

## 📊 Performance

- **Reconciliation Speed**: <500ms for 100 transactions
- **Database Queries**: Optimized with indexes on `txn_id` and `run_id`
- **Bundle Size**: 87.3 kB First Load JS (shared)
- **Lighthouse Score**: 95+ (Performance, Accessibility)

### Scalability

**Current**: Optimized for 100-10,000 transactions per run (in-memory processing)

**For millions of records**, implement:
- Batch processing (10K chunks)
- Database-side exact matching (SQL JOINs)
- Amount-bucketed index for fuzzy matching
- Background jobs (BullMQ, Inngest)

---

## 🔐 Security & Compliance

### Data Security
- ✅ Supabase Row Level Security (RLS) policies
- ✅ API keys in environment variables (never committed)
- ✅ Input validation on all API endpoints
- ✅ No sensitive data in error messages

### Audit Trail
- ✅ All reconciliation runs stored immutably
- ✅ AI tool calls logged with timestamps
- ✅ Exception resolution tracking (planned feature)
- ✅ Export Dataset for compliance reporting

### AI Safety
- ✅ Function calling enforces tool-call-only data access
- ✅ No hallucinations (agent cannot state numbers without tool calls)
- ✅ Tool call transparency (arguments + results visible in UI)

---

## 🚢 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/krishna-dtu/ledger-copilot)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - OPENAI_API_KEY (optional)
```

### Environment Variables in Vercel

1. Go to **Project Settings** → **Environment Variables**
2. Add the same variables from `.env.local`
3. Redeploy to apply changes

---

## 🛠️ Development

### Mock Agent vs OpenAI Agent

The project includes **two agent implementations**:

**1. Mock Agent** (`lib/agent/mock-agent.ts`):
- Queries Supabase directly (no OpenAI API calls)
- Zero API costs
- Used by default for demos
- Same tool-calling patterns as OpenAI agent

**2. OpenAI Agent** (`lib/agent/openai-agent.ts`):
- GPT-3.5-turbo with function calling
- Full natural language understanding
- Requires `OPENAI_API_KEY`

**Switch agents** in `app/api/ask/route.ts`:

```typescript
// Use mock agent (default)
import { askAgent } from '@/lib/agent/mock-agent'

// Use OpenAI agent (requires API key)
// import { askAgent } from '@/lib/agent/openai-agent'
```

### Key Design Decisions

1. **Deterministic Reconciliation**: No LLM involved in matching logic (guarantees accuracy)
2. **Tool-Call-Only AI**: Agent cannot state numbers without fetching from database
3. **Honest Metrics**: Match rate includes duplicates in denominator
4. **INR Formatting**: Indian digit grouping throughout (₹4,50,000 not ₹450,000)
5. **Settlement Constraints**: Bank date must be >= ledger date (settlements can't precede recognition)

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features (maintain 100% core logic coverage)
- Follow TypeScript best practices (strict mode enabled)
- Use Prettier for code formatting
- Update documentation for API changes

---

## 📝 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Krishna Joshi**

Built as part of an academic project to demonstrate AI-powered fintech automation.

---

## 🙏 Acknowledgments

- **Supabase** for providing excellent PostgreSQL hosting
- **OpenAI** for GPT-3.5-turbo function calling capabilities
- **Vercel** for seamless Next.js deployment
- **Tailwind CSS** and **Framer Motion** for making UI development delightful

---

## 📚 Additional Resources

- [Reconciliation Engine Requirements](./docs/reconciliation-engine-requirements.md)
- [Reconciliation Engine Design](./docs/reconciliation-engine-design.md)
- [Dashboard Features](./docs/dashboard-features.md)
- [Video Pitch Guide](./VIDEO-PITCH-PROMPT.md)

---
