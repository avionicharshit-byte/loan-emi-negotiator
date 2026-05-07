import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";

import { buildSystemPrompt } from "@/lib/domain";
import { loanProfileSchema, negotiationPlanSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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
- Principal outstanding: ₹${profile.principalOutstanding.toLocaleString("en-IN")}
- Current rate: ${profile.currentRate}%
- Tenure remaining: ${profile.tenureRemainingMonths} months
- Current EMI: ₹${profile.currentEMI.toLocaleString("en-IN")}
- Loan sanction date: ${profile.sanctionDate}
- CIBIL score: ${profile.cibilScore}
- On-time EMIs paid: ${profile.emisPaidOnTime}
- Prepayments made (total): ₹${profile.prepaymentsTotal.toLocaleString("en-IN")}
- Monthly income: ₹${profile.monthlyIncome.toLocaleString("en-IN")}
- Employer category: ${profile.employerCategory}
${profile.competingOffer?.lender ? `- Competing offer: ${profile.competingOffer.lender} at ${profile.competingOffer.rate}%` : "- Competing offer: none disclosed"}
${profile.additionalContext ? `- Additional context: ${profile.additionalContext}` : ""}

Build the most credible plan you can with this profile. Map the borrower to the lender's published rate-card tier. Use the data snapshot for repo rate and EBLR floors. Be specific — never generic. If a key input is missing, mark confidence accordingly and list the missing inputs in assumptions.`;

  const result = streamObject({
    model: google(MODEL),
    schema: negotiationPlanSchema,
    system: buildSystemPrompt(),
    prompt: userMessage,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
