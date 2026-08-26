# Ledger Copilot

**Settlement reconciliation agent: AI Finance Controller**

A reconciliation system that matches transaction records from internal ledgers and bank statements, identifies discrepancies, and provides an AI-powered Q&A interface to investigate settlement exceptions.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API (function calling)
- **Charts**: Recharts
- **Testing**: Vitest

## Project Status

✅ **Phase 1: Project Scaffolding** (Complete)
- Next.js 14 project initialized
- TypeScript, Tailwind CSS, and Vitest configured
- Environment variables set up (.env.local)
- Supabase and Gemini API credentials configured

📝 **Phase 2: Reconciliation Engine Spec** (Complete — Awaiting Review)
- Requirements document: `docs/reconciliation-engine-requirements.md`
- Design document: `docs/reconciliation-engine-design.md`

⏳ **Phase 3: Reconciliation Engine Implementation** (Next)
- Core matching logic (exact + fuzzy matching)
- Exception classification (6 types)
- Unit tests for all exception types

⏳ **Phase 4+**: API layer, Q&A agent, dashboard UI, deployment

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test
```

## Documentation

- [Project Brief](./prompt.md) — Full requirements and product spec
- [Reconciliation Engine Requirements](./docs/reconciliation-engine-requirements.md)
- [Reconciliation Engine Design](./docs/reconciliation-engine-design.md)

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

## Architecture Principles

**Critical design rule**: The AI agent must NEVER state a number, transaction ID, or conclusion that didn't come from a tool call against the reconciliation engine. It narrates verified data, never reasons over raw data.

## License

Built by Krishna Joshi as part of Academic Project.
