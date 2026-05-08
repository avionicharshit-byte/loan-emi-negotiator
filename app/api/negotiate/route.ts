import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";

import { buildSystemPrompt } from "@/lib/domain";
import { loanProfileSchema, negotiationPlanSchema } from "@/lib/schema";

export const runtime = "nodejs";

// Extend maxDuration to account for fallback attempts and potential waits.
export const maxDuration = 120;

// Order of models to try. If one is rate-limited, we immediately try the next.
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

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

Build the most credible plan you can with this profile. Map the borrower to the lender's published rate-card tier. Use the data snapshot for repo rate and EBLR floors. Be specific \u2014 never generic. If a key input is missing, mark confidence accordingly and list the missing inputs in assumptions.`;

  // ─── Retry & Fallback Logic ──────────────────────────────────────────────
  // We try each model in FALLBACK_MODELS in order. If a model hits a rate limit,
  // we immediately jump to the next model in the list. If ALL models in the list
  // are rate-limited, we wait and retry the whole cycle once more.
  const MAX_CYCLES = 2; 
  const DEFAULT_RETRY_DELAY_MS = 20_000;

  let lastError: unknown;

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    for (const modelId of FALLBACK_MODELS) {
      try {
        console.log(`[negotiate] Attempting with ${modelId} (Cycle ${cycle})`);
        
        const result = streamObject({
          model: google(modelId),
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

        if (!isRateLimit) {
          // If it's a real logic error (not a quota issue), stop immediately.
          break;
        }

        console.warn(`[negotiate] ${modelId} rate-limited. Trying next fallback...`);
        // Continue to the next modelId in FALLBACK_MODELS immediately.
      }
    }

    // If we get here, it means we cycled through ALL models and all were rate-limited.
    if (cycle < MAX_CYCLES) {
      const msg = lastError instanceof Error ? lastError.message : String(lastError);
      const retryMatch = msg.match(/retry in ([\d.]+)\s*s/i);
      const waitMs = retryMatch
        ? Math.ceil(parseFloat(retryMatch[1])) * 1000 + 500
        : DEFAULT_RETRY_DELAY_MS;

      console.warn(`[negotiate] All models rate-limited. Waiting ${waitMs}ms before final cycle...`);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
    }
  }

  // Final fallback: return structured error if everything failed.
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
