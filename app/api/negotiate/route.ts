import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";

import { buildSystemPrompt } from "@/lib/domain";
import {
  allowsDemoFallback,
  buildDemoNegotiationPlan,
  createObjectTextStreamResponse,
  isDemoMode,
  isQuotaLikeError,
} from "@/lib/demo";
import { loanProfileSchema, negotiationPlanSchema } from "@/lib/schema";

export const runtime = "nodejs";

// Extend maxDuration to account for fallback attempts and potential waits.
export const maxDuration = 120;

// Order of models to try. If one is rate-limited, we immediately try the next.
const FALLBACK_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
];

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  const json = await req.json();
  const parsed = loanProfileSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_profile", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const profile = parsed.data;

  if (isDemoMode()) {
    return createObjectTextStreamResponse(buildDemoNegotiationPlan(profile), {
      headers: { "X-Demo-Reason": "demo_mode" },
    });
  }

  if (!process.env.GEMINI_API_KEY) {
    if (allowsDemoFallback()) {
      return createObjectTextStreamResponse(buildDemoNegotiationPlan(profile), {
        headers: { "X-Demo-Reason": "missing_api_key" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "missing_api_key",
        message: "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

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

  let lastError: unknown;

  for (const modelId of FALLBACK_MODELS) {
    try {
      console.log(`[negotiate] Attempting with ${modelId}`);

      const { object } = await generateObject({
        model: google(modelId),
        schema: negotiationPlanSchema,
        system: buildSystemPrompt(),
        prompt: userMessage,
        temperature: 0.4,
      });

      return createObjectTextStreamResponse(object, {
        headers: { "X-Model": modelId },
      });
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[negotiate] ${modelId} failed:`, err);

      if (allowsDemoFallback()) {
        return createObjectTextStreamResponse(buildDemoNegotiationPlan(profile), {
          headers: {
            "X-Demo-Reason": isQuotaLikeError(err) ? "quota_fallback" : "provider_fallback",
          },
        });
      }
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : String(lastError);
  const isRateLimit = isQuotaLikeError(lastError);

  if (allowsDemoFallback()) {
    return createObjectTextStreamResponse(buildDemoNegotiationPlan(profile), {
      headers: { "X-Demo-Reason": isRateLimit ? "quota_fallback" : "provider_fallback" },
    });
  }

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
