# Migration from Gemini to OpenAI

## Why the Change?

The Gemini API was causing repeated internal server errors due to:
- Rate limiting issues (20 requests per minute on free tier)
- New API format (Interactions API) with stability issues
- AQ. key format authentication problems

**OpenAI provides:**
- More reliable API
- Better rate limits
- Mature function calling support
- Clearer error messages

---

## Changes Made:

### 1. **Dependencies**
- ❌ Removed: `@google/genai`
- ✅ Added: `openai`

### 2. **Environment Variables**
**Before:**
```
GEMINI_API_KEY=AQ.Ab8RN6...
```

**After:**
```
OPENAI_API_KEY=sk-...
```

### 3. **Agent Implementation**
- **File:** `lib/agent/openai-agent.ts` (new)
- **Model:** `gpt-4o-mini` (fast, cheap, reliable)
- **Function calling:** Using OpenAI's native tools format

### 4. **API Route**
- **File:** `app/api/ask/route.ts`
- Updated import from `gemini-agent` → `openai-agent`

### 5. **UI Updates**
- **ChatInterface:** "Powered by Gemini" → "Powered by OpenAI"

### 6. **Files Deleted**
- `lib/agent/gemini-agent.ts`
- `lib/agent/gemini-agent-simple.ts`
- `lib/agent/gemini-tools.ts`

---

## Setup Instructions:

### Step 1: Get OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-...`)

### Step 2: Update `.env.local`
Open `.env.local` and replace:
```
OPENAI_API_KEY=your-openai-api-key-here
```

With your actual key:
```
OPENAI_API_KEY=sk-proj-...your-actual-key...
```

### Step 3: Test Connection
```bash
npx tsx scripts/test-openai.ts
```

Should see:
```
✅ Success! OpenAI is connected
Response: OpenAI is working!
```

### Step 4: Start Dashboard
```bash
npm run dev
```

Visit `http://localhost:3000` and try the chat:
- "What is the current match rate?"
- "Show me timing lag exceptions"
- "Tell me about transaction TXN0046"

---

## OpenAI Function Calling

The agent uses 3 functions bound to your API routes:

1. **get_match_rate** → `GET /api/reconcile`
   - Returns: total_records, matched_count, match_rate

2. **get_exceptions** → `GET /api/exceptions?type=...`
   - Params: type (optional), run_id (optional)
   - Returns: count, exceptions array

3. **get_transaction** → `GET /api/transaction/:txnId`
   - Params: txn_id (required)
   - Returns: transaction details from both ledger and bank

---

## Model: gpt-4o-mini

**Why this model?**
- Fast responses (~1-2 seconds)
- Low cost ($0.15 per 1M input tokens)
- Excellent function calling support
- Reliable and stable

**Alternatives:**
- `gpt-4o` - More powerful but slower/expensive
- `gpt-3.5-turbo` - Cheaper but less reliable function calling

---

## Rate Limits (OpenAI Free Tier):

- **3 RPM** (requests per minute) for gpt-4o-mini
- **200 RPD** (requests per day)
- **40,000 TPM** (tokens per minute)

Much more reliable than Gemini's free tier!

---

## Testing:

1. **Basic connection:** `npx tsx scripts/test-openai.ts`
2. **Agent Q&A:** Use chat interface in dashboard
3. **API directly:** `curl http://localhost:3000/api/ask -X POST -H "Content-Type: application/json" -d '{"question":"What is the match rate?"}'`

---

## Troubleshooting:

### Error: "OPENAI_API_KEY not found"
→ Make sure `.env.local` has the key and restart dev server

### Error: "Invalid API key"
→ Check key format (should start with `sk-`)
→ Verify key is active at https://platform.openai.com/api-keys

### Error: "Rate limit exceeded"
→ Wait 1 minute (free tier: 3 requests/min)
→ Consider upgrading to paid tier for higher limits

---

## Cost Estimate:

For this project with typical usage:
- ~10-20 questions/day
- ~500 tokens per question (with function calls)
- **Cost: < $0.01 per day** (essentially free)

---

**✅ Migration Complete!**

The agent is now using OpenAI and should be much more reliable.
