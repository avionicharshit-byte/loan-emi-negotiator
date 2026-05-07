import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";

import { buildSystemPrompt } from "@/lib/domain";
import { counterPlanSchema, rmReplyRequestSchema } from "@/lib/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response(
      JSON.stringify({ error: "missing_api_key", message: "GEMINI_API_KEY is not set." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const json = await req.json();
  const parsed = rmReplyRequestSchema.safeParse(json);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "invalid_request", issues: parsed.error.issues }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const { profile, originalTargetLow, originalTargetHigh, rmReplyText } = parsed.data;

  const userMessage = `The borrower previously asked for a rate reset based on this profile:

- Loan: ${profile.lender} ${profile.loanType} loan, ₹${profile.principalOutstanding.toLocaleString("en-IN")} outstanding @ ${profile.currentRate}%
- Tenure remaining: ${profile.tenureRemainingMonths} months
- CIBIL: ${profile.cibilScore}, Employer: ${profile.employerCategory}
- On-time EMIs: ${profile.emisPaidOnTime}, Prepayments: ₹${profile.prepaymentsTotal.toLocaleString("en-IN")}
- Original target rate band asked: ${originalTargetLow.toFixed(2)}% – ${originalTargetHigh.toFixed(2)}%

The RM has now replied with the following message. Read it carefully and decide what to do next.

RM's reply (verbatim):
"""
${rmReplyText}
"""

Output a counter-plan per the schema:
1. Classify the RM's stance (accepted / partial_offer / rejected / deflected / asked_for_docs).
2. Extract any specific rate or fees the RM quoted.
3. Recommend an action (accept / counter / escalate / walk_away) — be honest. If the RM's offer is within or above the original target band, recommend accept. If meaningfully short of target but within negotiating distance, recommend counter. If the RM rejected outright after the borrower's leverage was strong, recommend escalate. If the gap is too small to chase, recommend walk_away (refinance elsewhere).
4. If counter or escalate, draft a specific reply and/or escalation steps.
5. Always list 1–4 watch-outs grounded in what the RM actually wrote.

Be specific to the borrower's profile and what the RM said. Never generic.`;

  const result = streamObject({
    model: google(MODEL),
    schema: counterPlanSchema,
    system: buildSystemPrompt(),
    prompt: userMessage,
    temperature: 0.4,
  });

  return result.toTextStreamResponse();
}
