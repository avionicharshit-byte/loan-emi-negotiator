import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";

import { buildSystemPrompt } from "@/lib/domain";
import { loanProfileSchema, negotiationPlanSchema } from "@/lib/schema";

export const runtime = "nodejs";

// Extend maxDuration to account for up to 3 retries with ~20 s waits each.
export const maxDuration = 120;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "missing_api_key",
        message: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const json = await req.json();
  const parsed = loanProfileSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_profile", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const profile = parsed.data;

  const userMessage = `Generate a negotiation plan for this borrower.

Loan profile:
- Loan type: ${profile.loanType}
- Lender: ${profile.lender}
- Principal outstanding: \u20b9${profile.principalOutstanding.toLocaleString("en-IN")}
- Current rate: ${profile.currentRate}%
- Tenure remaining: ${profile.tenureRemainingMonths} months
- Current EMI: \u20b9${profile.currentEMI.toLocaleString("en-IN")}
- Loan sanction date: ${profile.sanctionDate}
- CIBIL score: ${profile.cibilScore}
- On-time EMIs paid: ${profile.emisPaidOnTime}
- Prepayments made (total): \u20b9${profile.prepaymentsTotal.toLocaleString("en-IN")}
- Monthly income: \u20b9${profile.monthlyIncome.toLocaleString("en-IN")}
- Employer category: ${profile.employerCategory}
${profile.competingOffer?.lender ? `- Competing offer: ${profile.competingOffer.lender} at ${profile.competingOffer.rate}%` : "- Competing offer: none disclosed"}
${profile.additionalContext ? `- Additional context: ${profile.additionalContext}` : ""}

Build the most credible plan you can with this profile. Map the borrower to the lender's published rate-card tier. Use the data snapshot for repo rate and EBLR floors. Be specific — never generic. If a key input is missing, mark confidence accordingly and list the missing inputs in assumptions.`;

  // ─── Retry loop for 429 / RESOURCE_EXHAUSTED ──────────────────────────────
  // Gemini's free tier has a strict requests-per-minute cap. When hit, Gemini
  // embeds a "retry in Xs" hint in the error. We honour that hint and retry
  // automatically (up to MAX_ATTEMPTS) so demo viewers never see an error.
  const MAX_ATTEMPTS = 3;
  const DEFAULT_RETRY_DELAY_MS = 20_000; // fallback if hint not in error

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = streamObject({
        model: google(MODEL),
        schema: negotiationPlanSchema,
        system: buildSystemPrompt(),
        prompt: userMessage,
        temperature: 0.4,
      });

      return result.toTextStreamResponse();
    } catch (err: unknown) {
      lastError = err;

      const msg = err instanceof Error ? err.message : String(err);
      const isRateLimit = /RESOURCE_EXHAUSTED|quota|429/i.test(msg);

      if (!isRateLimit || attempt === MAX_ATTEMPTS) {
        // Not a rate-limit error, or we've exhausted all retries — break out.
        break;
      }

      // Parse the suggested wait from the Gemini error message, e.g.:
      //   "Please retry in 18.638263348s."
      const retryMatch = msg.match(/retry in ([\d.]+)\s*s/i);
      const waitMs = retryMatch
        ? Math.ceil(parseFloat(retryMatch[1])) * 1000 + 500 // +500 ms safety buffer
        : DEFAULT_RETRY_DELAY_MS;

      console.warn(
        `[negotiate] Rate-limited by Gemini (attempt ${attempt}/${MAX_ATTEMPTS}). ` +
          `Waiting ${waitMs}ms before retry…`,
      );

      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    }
  }

  // All attempts failed — return a structured error so the frontend
  // ErrorCard renders a friendly message instead of crashing.
  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  const isRateLimit = /RESOURCE_EXHAUSTED|quota|429/i.test(errMsg);

  return new Response(
    JSON.stringify({
      error: isRateLimit ? "rate_limited" : "generation_failed",
      message: errMsg,
    }),
    {
      status: isRateLimit ? 429 : 500,
      headers: { "Content-Type": "application/json" },
    },
  );
}
