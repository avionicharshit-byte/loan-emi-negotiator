# Loan EMI Negotiator

An AI agent that turns an Indian borrower's loan profile into a lender-specific rate-negotiation artifact: target rate band, ranked arguments with sources, draft email, and phone script.

**Live demo →** [loan-emi-negotiator.netlify.app](https://loan-emi-negotiator.netlify.app/)

> Most borrowers know they're probably overpaying. The hard part isn't knowing — it's **writing the actual ask**. This product collapses that last mile.

## The problem

Indian retail borrowers typically pay **0.5–1.5% above their lender's own published rate floor** for the same CIBIL band, simply because they never write the email asking for a reset. Generic finance chatbots explain repo rates and EBLR; the borrower still has to figure out *what to say to the bank*. The gap between **informing** and **acting** is where the real product value lives — and where trust is hardest.

## The product wedge

Three deliberate scope choices that shape the whole product:

1. **One painful workflow, not "AI personal finance".** The agent does one thing: produce a credible, lender-aware rate-reduction request. Narrow scope is what makes the AI feel reliable.
2. **Action artifact, not a chat.** Output is a structured plan — target rate, ranked arguments, email, phone script — that the user can edit and send. No conversational ambiguity.
3. **Trust design over model quality.** Every claim cites a source. Assumptions and confidence are surfaced. Nothing auto-sends. The model is a drafter and strategist, not an authority.

## What the user gets

A single artifact, generated in ~90 seconds:

- **Target rate band** mapped to the lender's published EBLR floor + the borrower's CIBIL band
- **Estimated EMI reduction & total interest saved**
- **Ranked negotiation arguments**, each with a public RBI / lender source URL
- **Draft email** to the relationship manager (editable)
- **Phone script** with three pre-handled objections
- **Stated assumptions, confidence level, and missing inputs**

Supports home, personal, auto, LAP, education, gold, and business loans across major Indian lenders (SBI, HDFC, ICICI, Axis, Kotak, BoB, PNB, etc.).

## Key product decisions

| Decision | Why |
|---|---|
| Hardcoded lender rate-card snapshot in `lib/domain.ts` | Grounds the model with verifiable floors. A live scrape would be more accurate but introduces audit/freshness risk for a portfolio MVP — explicitly flagged as a follow-up. |
| Optional statement upload (PDF/image) → Gemini extract | Removes the biggest drop-off — manual data entry — without making the doc upload a hard requirement. Users can still type values in. |
| Demo profiles + deterministic fallback | A live walkthrough cannot fail because of API quota. Reliability is a product feature when a recruiter or stakeholder is watching. |
| Streaming structured output (Zod schema) | Faster perceived latency *and* a typed contract that prevents malformed plans from rendering. |
| Editable email + phone script | The model drafts; the human commits. Treats the borrower as accountable, not as a passive consumer of AI output. |

## Reliability architecture (graceful degradation)

The agent is built to **never show a broken state** during a demo or a quota spike. The negotiate route walks down a fallback ladder:

```
DEMO_MODE=true ─────────► deterministic plan from lib/demo.ts            (no API call)
       │
       ▼
GEMINI_API_KEY missing ─► deterministic plan (if DEMO_FALLBACK on)       OR 500 error
       │
       ▼
gemini-2.5-flash-lite ─► generates plan ✓
       │ (rate-limit / 5xx)
       ▼
gemini-2.5-flash ──────► generates plan ✓
       │ (rate-limit / 5xx)
       ▼
gemini-2.0-flash-lite ─► generates plan ✓
       │ (rate-limit / 5xx)
       ▼
gemini-2.0-flash ──────► generates plan ✓
       │ (all four exhausted)
       ▼
DEMO_FALLBACK=true ────► deterministic plan (response tagged X-Demo-Reason)
       │ else
       ▼
429 rate_limited / 500 generation_failed (surfaced to UI)
```

Every fallback response carries an `X-Demo-Reason` header (`demo_mode`, `missing_api_key`, `quota_fallback`, `provider_fallback`) so it's auditable in the network tab.

## Tech stack

Next.js 16 (App Router) · React 19 · TypeScript · AI SDK + Google Gemini · Zod schemas · React Hook Form · Tailwind CSS

## Run locally

```bash
npm install
cp .env.example .env.local
# Add GEMINI_API_KEY (from Google AI Studio)
npm run dev
```

Open `http://localhost:3000` → click *Try the agent* or go to `/negotiate`.

For a quota-proof local demo: set `DEMO_MODE=true` in `.env.local` and restart.

## Deploy on Netlify

`netlify.toml`, `.nvmrc`, and `.node-version` are committed.

In the Netlify dashboard:
- Build command: `npm run build` · Publish dir: `.next` · Node: 20
- Set `GEMINI_API_KEY` (Functions + Builds scope, never `NEXT_PUBLIC_`)
- For a public portfolio link, also set `DEMO_MODE=true` to prevent quota drain by visitors
- Or set `DEMO_FALLBACK=true` for live AI with deterministic fallback on errors

## What's not there yet

Intentional follow-ups, called out so the scope is honest:

- Lender rate-card data is a hand-curated snapshot, not a live scrape with audit trail.
- Generated advice is not financial advice — must be verified against the loan agreement.
- Statement extraction quality varies with PDF/image quality.
- No persistence, accounts, or encrypted document storage.
- No automated eval suite for hallucination, source quality, or plan usefulness.
- Non-home-loan pricing uses indicative benchmarks rather than fully scraped lender-specific cards.

## Not financial advice

Snapshot data dated May 2026. Verify every rate, fee, and slab with your lender before acting.
