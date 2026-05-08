# Loan EMI Negotiator

AI assistant that turns an Indian borrower's loan profile into a lender-specific rate negotiation plan, draft email, and phone script.

Most borrowers know they are probably paying too much, but the hard part is turning that hunch into a credible ask. This project explores that last mile: using AI to produce a concrete action artifact grounded in CIBIL bands, lender rate-card floors, repayment history, and RBI-linked rate movement.

## What It Does

- Collects a home, personal, or auto loan profile with sensible defaults for quick demos.
- Supports home, personal, auto, loan against property, education, gold, and business loan scenarios.
- Includes demo profiles and a deterministic fallback so quota issues do not break a walkthrough.
- Optionally extracts loan details from a PDF or image statement using Gemini.
- Streams a structured negotiation plan from `/api/negotiate`.
- Produces a target rate range, savings estimate, ranked arguments with source URLs, a concise email draft, a phone script, objection handling, assumptions, and confidence.
- Keeps the human in control: nothing is auto-sent, and the email stays editable.

## Proof It Runs

```bash
$ npm run lint

> loan-emi-negotiator@0.1.0 lint
> eslint
```

```bash
$ npm run build

> loan-emi-negotiator@0.1.0 build
> next build

▲ Next.js 16.2.5 (Turbopack)
✓ Compiled successfully in 6.3s
✓ Generating static pages using 7 workers (8/8) in 313ms

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/counter
├ ƒ /api/extract
├ ƒ /api/negotiate
└ ○ /negotiate
```

```text
Generated artifact shape:

Target rate band
Savings estimate
Ranked negotiation arguments with sources
Draft email to the lender or relationship manager
Phone script with objection handling
Assumptions and confidence level
```

## Product Insight

The product bet is that finance AI becomes useful when it moves from "explaining" to "acting". A generic chatbot can explain repo rates, EBLR, or CIBIL bands; the user still has to decide what to say to the bank. This app focuses on producing the artifact the borrower actually needs: a respectful, specific, lender-aware negotiation request.

The trust design matters more than the model call. The app shows assumptions, confidence, source links, and editable output because a borrower should not blindly send AI-generated financial communication. The model is useful as a drafter and strategist, not as an authority.

The strongest PM lesson: narrow scope makes the AI feel more reliable. Instead of "AI personal finance", this targets one painful workflow: "I think my bank should reduce my rate, but I do not know how to ask."

## How To Run Locally

Requirements:

- Node.js 20+
- npm
- Gemini API key from Google AI Studio

```bash
npm install
cp .env.example .env.local
```

Update `.env.local`:

```bash
GEMINI_API_KEY=your_real_key_here
# Optional
GEMINI_MODEL=gemini-2.5-flash-lite

# Optional: use this before demos if you do not want to depend on API quota
DEMO_MODE=true
```

Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`, then click `Try the agent` or go directly to `http://localhost:3000/negotiate`.

For a reliable live demo, set `DEMO_MODE=true` in `.env.local`, restart the dev server, and click one of the demo profiles at the top of the form. The visible loan basics should change immediately when a profile is selected.

Useful checks:

```bash
npm run lint
npm run build
```

## Deploy On Netlify

This repo includes `netlify.toml`, `.nvmrc`, and `.node-version` so Netlify can build the app directly from GitHub.

In the Netlify dashboard:

- Connect the GitHub repository.
- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `20`

Set environment variables in Netlify:

```bash
GEMINI_API_KEY=your_real_key_here
DEMO_FALLBACK=true
```

For a quota-proof public demo, use:

```bash
DEMO_MODE=true
```

`DEMO_MODE=true` skips live Gemini calls and uses deterministic sample output. Leave it unset if you want live AI generation, with `DEMO_FALLBACK=true` as the safety net.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- AI SDK with Google Gemini
- Zod schemas for structured AI output
- React Hook Form
- Tailwind CSS

## What Is Not There Yet

- The lender rate-card snapshot is hardcoded in `lib/domain.ts`; a production version should refresh and audit this data regularly.
- The generated advice is not financial advice and must be verified against the borrower's lender and loan agreement.
- Statement extraction depends on the quality and format of uploaded PDFs or images.
- There is no user account system, persistence layer, or encrypted document storage.
- There is no automated evaluation suite for hallucination, source quality, or negotiation-plan usefulness yet.
- The app supports common Indian loan categories, but some non-home-loan pricing uses indicative benchmarks rather than fully scraped lender-specific rate cards.

## Repository Hygiene

Local secrets and generated files are ignored:

- `.env.local` and other local env files
- `node_modules/`
- `.next/`, `out/`, and build output
- IDE files such as `.idea/`, `.vscode/`, and `.claude/`
- TypeScript build info

`.env.example` is intentionally committed so setup is clear without exposing secrets.
