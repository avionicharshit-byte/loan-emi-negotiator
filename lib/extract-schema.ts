import { z } from "zod";

import { EMPLOYER_CATEGORIES, LENDERS, LOAN_TYPES } from "./schema";

/**
 * Schema for fields the agent can plausibly extract from a loan account statement
 * (PDF or image). Every field is optional — the user fills in anything the document
 * doesn't contain. Numeric fields are allowed null when not detectable.
 */
export const extractedLoanDataSchema = z.object({
  loanType: z.enum(LOAN_TYPES).nullish().describe("home / personal / auto loan, inferred from product name"),
  lender: z.enum(LENDERS).nullish().describe("Which bank issued the loan. Use 'Other' if not HDFC/SBI/ICICI"),
  principalOutstanding: z.number().nullish().describe("Current principal outstanding in ₹ (not original sanction amount)"),
  currentRate: z.number().nullish().describe("Current rate of interest in percent, e.g. 9.25"),
  tenureRemainingMonths: z.number().int().nullish().describe("Remaining tenure in months. Convert from years if needed."),
  currentEMI: z.number().nullish().describe("Monthly EMI amount in ₹"),
  sanctionDate: z.string().nullish().describe("YYYY-MM format, e.g. 2022-08"),
  emisPaidOnTime: z.number().int().nullish().describe("Number of EMIs paid so far without delay"),
  prepaymentsTotal: z.number().nullish().describe("Total prepayments made so far in ₹, sum of all part-prepayments"),
  cibilScore: z.number().int().nullish().describe("CIBIL credit score if shown on the document. Usually NOT on a loan statement."),
  monthlyIncome: z.number().nullish().describe("Monthly income — usually NOT on a loan statement, leave null"),
  employerCategory: z.enum(EMPLOYER_CATEGORIES).nullish().describe("Employer category — usually NOT on a loan statement, leave null"),
  documentTypeDetected: z
    .string()
    .describe("What kind of document this looks like — e.g. 'HDFC home loan statement', 'SBI sanction letter', 'unrelated document'"),
  notes: z
    .string()
    .nullish()
    .describe("Any caveats: low quality scan, ambiguous values, fields you guessed vs. read directly"),
});

export type ExtractedLoanData = z.infer<typeof extractedLoanDataSchema>;

export const EXTRACT_SYSTEM_PROMPT = `You are an OCR + reasoning assistant that extracts structured loan data from Indian retail-loan documents (typically a monthly loan account statement, sometimes a sanction letter).

Rules:
1. Only fill a field if you can read it directly from the document or compute it from clearly-labeled values. NEVER hallucinate numbers.
2. If a value isn't present, leave the field as null. Do not guess.
3. For 'tenureRemainingMonths': if the document gives 'remaining tenure: 15 years' convert to months (180). If it gives 'months remaining: 180' use as-is.
4. For 'principalOutstanding': use the *current* outstanding, NOT the original sanction amount. These are usually labeled 'Principal Outstanding' or 'POS' (Principal Outstanding Statement).
5. For 'currentRate': use the *current applicable rate*, not historical rates. May be labeled 'Rate of Interest', 'ROI', or 'Current Rate'.
6. CIBIL score, monthly income, and employer category are almost never on loan statements — leave null.
7. In 'documentTypeDetected', name the document and lender if recognizable, e.g. 'HDFC home loan account statement, July 2025'.
8. In 'notes', flag anything ambiguous: poor scan quality, multiple loans on one statement, suspected typos, fields you had to compute vs. read.
9. If the document is NOT a loan statement (e.g. salary slip, random photo), set documentTypeDetected to describe what it actually is and leave all loan fields null.`;
