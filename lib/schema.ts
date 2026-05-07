import { z } from "zod";

export const LOAN_TYPES = ["home", "personal", "auto"] as const;
export const LENDERS = ["HDFC", "SBI", "ICICI", "Other"] as const;
export const EMPLOYER_CATEGORIES = ["Government / PSU", "MNC / Listed Co.", "Private (unlisted)", "Self-employed"] as const;

export const loanProfileSchema = z.object({
  loanType: z.enum(LOAN_TYPES),
  lender: z.enum(LENDERS),
  principalOutstanding: z.number().positive("Must be greater than zero"),
  currentRate: z.number().min(1).max(40),
  tenureRemainingMonths: z.number().int().positive().max(480),
  currentEMI: z.number().positive(),
  sanctionDate: z.string().min(4),
  cibilScore: z.number().int().min(300).max(900),
  emisPaidOnTime: z.number().int().min(0),
  prepaymentsTotal: z.number().min(0),
  monthlyIncome: z.number().positive(),
  employerCategory: z.enum(EMPLOYER_CATEGORIES),
  competingOffer: z
    .object({
      lender: z.string().optional(),
      rate: z.number().optional(),
    })
    .optional(),
  additionalContext: z.string().max(800).optional(),
});

export type LoanProfile = z.infer<typeof loanProfileSchema>;

export const negotiationPlanSchema = z.object({
  targetRate: z.object({
    low: z.number().describe("Lower bound of realistic target rate, in percent"),
    high: z.number().describe("Upper bound of realistic target rate, in percent"),
    reasoning: z
      .string()
      .describe("2–3 sentences grounding the target band in the borrower's profile and the lender's published rate card"),
  }),
  savingsEstimate: z.object({
    monthlyEmiReduction: z.number().describe("Reduction in monthly EMI in ₹ if target rate is achieved (use mid of target band)"),
    totalInterestSaved: z.number().describe("Total interest saved over remaining tenure in ₹"),
    method: z.string().describe("One sentence on how the estimate was computed"),
  }),
  arguments: z
    .array(
      z.object({
        rank: z.number().int().min(1),
        title: z.string().describe("Short headline of the argument, e.g., 'CIBIL 790 → premium tier'"),
        body: z.string().describe("2–4 sentences making the argument, with specific numbers from the borrower's profile"),
        leverage: z.enum(["high", "medium", "low"]),
        sourceLabel: z.string().describe("What the source is, e.g., 'HDFC published rate card' or 'RBI repo rate'"),
        sourceUrl: z.string().describe("Direct URL to the source"),
      }),
    )
    .min(3)
    .max(6),
  emailDraft: z.object({
    subject: z.string(),
    body: z.string().describe("Full email body, under 200 words, Indian English, addressed to lender RM. Use placeholders [Account Number], [Branch] where applicable."),
    recipient: z.string().describe("Who the email should go to, e.g., 'Your branch Relationship Manager'"),
  }),
  phoneScript: z.object({
    opening: z.string().describe("First 2–3 lines the borrower should say"),
    theAsk: z.string().describe("The exact ask, in one sentence"),
    objectionResponses: z
      .array(
        z.object({
          ifTheyaSay: z.string().describe("Verbatim or paraphrased RM objection"),
          youReply: z.string().describe("Suggested response"),
        }),
      )
      .min(2)
      .max(5),
    closing: z.string().describe("How to wrap the call, including next-step ask (e.g., written confirmation)"),
  }),
  assumptions: z
    .array(z.string())
    .describe("What the agent assumed when generating this plan — gaps in user data, market conditions, etc."),
  confidence: z.enum(["low", "medium", "high"]),
  confidenceReason: z.string().describe("One sentence explaining the confidence level"),
  nextSteps: z.array(z.string()).min(2).max(5),
});

export type NegotiationPlan = z.infer<typeof negotiationPlanSchema>;
