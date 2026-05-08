import {
  CIBIL_BANDS,
  DOMAIN_SNAPSHOT_DATE,
  ADDITIONAL_LOAN_RATE_BENCHMARKS,
  LENDER_RATE_CARDS,
  RATE_ENVIRONMENT,
} from "@/lib/domain";
import type { CounterPlan, LoanProfile, NegotiationPlan } from "@/lib/schema";

type LenderKey = keyof typeof LENDER_RATE_CARDS;

export const DEMO_PROFILES: Array<{
  id: string;
  label: string;
  description: string;
  profile: LoanProfile;
}> = [
  {
    id: "hdfc-premium-home",
    label: "HDFC premium home loan",
    description: "Strong CIBIL, MNC salary, meaningful prepayment history.",
    profile: {
      loanType: "home",
      lender: "HDFC",
      principalOutstanding: 4500000,
      currentRate: 9.25,
      tenureRemainingMonths: 180,
      currentEMI: 41200,
      sanctionDate: "2022-08",
      cibilScore: 790,
      emisPaidOnTime: 32,
      prepaymentsTotal: 200000,
      monthlyIncome: 175000,
      employerCategory: "MNC / Listed Co.",
      additionalContext: "Salary account and one credit card are also with HDFC.",
    },
  },
  {
    id: "sbi-psu-home",
    label: "SBI PSU borrower",
    description: "Government profile with clean repayment and long tenure left.",
    profile: {
      loanType: "home",
      lender: "SBI",
      principalOutstanding: 6200000,
      currentRate: 8.95,
      tenureRemainingMonths: 216,
      currentEMI: 56500,
      sanctionDate: "2021-11",
      cibilScore: 765,
      emisPaidOnTime: 45,
      prepaymentsTotal: 350000,
      monthlyIncome: 145000,
      employerCategory: "Government / PSU",
      additionalContext: "Borrower has salary account with SBI and no missed EMI.",
    },
  },
  {
    id: "icici-competitor",
    label: "ICICI with competing offer",
    description: "Retention case with another lender quoting a lower rate.",
    profile: {
      loanType: "home",
      lender: "ICICI",
      principalOutstanding: 3800000,
      currentRate: 9.35,
      tenureRemainingMonths: 144,
      currentEMI: 40100,
      sanctionDate: "2020-05",
      cibilScore: 805,
      emisPaidOnTime: 58,
      prepaymentsTotal: 500000,
      monthlyIncome: 220000,
      employerCategory: "MNC / Listed Co.",
      competingOffer: { lender: "SBI", rate: 8.55 },
      additionalContext: "Borrower prefers not to refinance if ICICI can match closely.",
    },
  },
  {
    id: "axis-auto",
    label: "Axis auto loan",
    description: "Shorter-tenure case where the agent should be realistic.",
    profile: {
      loanType: "auto",
      lender: "Axis",
      principalOutstanding: 820000,
      currentRate: 10.4,
      tenureRemainingMonths: 42,
      currentEMI: 24500,
      sanctionDate: "2024-01",
      cibilScore: 748,
      emisPaidOnTime: 26,
      prepaymentsTotal: 50000,
      monthlyIncome: 115000,
      employerCategory: "Private (unlisted)",
      additionalContext: "Borrower has a salary account elsewhere.",
    },
  },
  {
    id: "bob-education",
    label: "BoB education loan",
    description: "Co-borrower income and strong bureau profile for a rate review.",
    profile: {
      loanType: "education",
      lender: "Bank of Baroda",
      principalOutstanding: 1800000,
      currentRate: 11.25,
      tenureRemainingMonths: 96,
      currentEMI: 28500,
      sanctionDate: "2023-07",
      cibilScore: 772,
      emisPaidOnTime: 18,
      prepaymentsTotal: 75000,
      monthlyIncome: 160000,
      employerCategory: "MNC / Listed Co.",
      additionalContext: "Co-borrower salary is stable and collateral documents are already with the bank.",
    },
  },
  {
    id: "kotak-business",
    label: "Kotak business loan",
    description: "SME borrower asking for repricing after stronger banking history.",
    profile: {
      loanType: "business",
      lender: "Kotak",
      principalOutstanding: 2400000,
      currentRate: 16.5,
      tenureRemainingMonths: 48,
      currentEMI: 69000,
      sanctionDate: "2024-03",
      cibilScore: 758,
      emisPaidOnTime: 22,
      prepaymentsTotal: 150000,
      monthlyIncome: 310000,
      employerCategory: "Self-employed",
      additionalContext: "GST filings and bank credits improved over the last 12 months.",
    },
  },
];

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function allowsDemoFallback() {
  return process.env.DEMO_FALLBACK !== "false";
}

export function isQuotaLikeError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  return /RESOURCE_EXHAUSTED|quota|429|rate.?limit/i.test(msg);
}

export function createObjectTextStreamResponse(
  object: unknown,
  init?: ResponseInit,
): Response {
  const text = JSON.stringify(object);
  const stream = new ReadableStream<string>({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });

  return new Response(stream.pipeThrough(new TextEncoderStream()), {
    ...init,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Demo-Fallback": "true",
      ...(init?.headers ?? {}),
    },
  });
}

export function buildDemoNegotiationPlan(profile: LoanProfile): NegotiationPlan {
  const lender = getLender(profile.lender);
  const pricing = getPricing(lender, profile.loanType);
  const band = getCibilBand(profile.cibilScore);
  const target = getTargetRate(profile.currentRate, pricing.floor, band.leverage);
  const midpoint = (target.low + target.high) / 2;
  const savings = estimateSavings(profile, midpoint);
  const gapBps = Math.max(0, Math.round((profile.currentRate - pricing.floor) * 100));
  const competitorGap =
    profile.competingOffer?.rate != null
      ? Math.max(0, profile.currentRate - profile.competingOffer.rate)
      : null;

  return {
    targetRate: {
      low: target.low,
      high: target.high,
      reasoning: `${profile.lender}'s indicative ${profile.loanType}-loan floor in this snapshot is ${pricing.floor.toFixed(2)}%. With CIBIL ${profile.cibilScore}, ${profile.emisPaidOnTime} on-time EMIs, and ${profile.employerCategory.toLowerCase()} income, a request around ${target.low.toFixed(2)}%–${target.high.toFixed(2)}% is credible but not guaranteed.`,
    },
    savingsEstimate: {
      monthlyEmiReduction: savings.monthlyReduction,
      totalInterestSaved: savings.totalInterestSaved,
      method: `Estimated by comparing the current rate with the midpoint target rate of ${midpoint.toFixed(2)}% over ${profile.tenureRemainingMonths} months on the outstanding principal.`,
    },
    arguments: [
      {
        rank: 1,
        title: `CIBIL ${profile.cibilScore} maps to ${band.label}`,
        body: `Your score sits in the ${band.label} band, which gives you ${band.leverage} negotiation leverage. Ask ${profile.lender} to map your profile to the closest published rate-card tier instead of keeping you at ${profile.currentRate.toFixed(2)}%.`,
        leverage: band.leverage === "highest" || band.leverage === "high" ? "high" : "medium",
        sourceLabel: `${lender.name} rate card`,
        sourceUrl: lender.rateCardUrl,
      },
      {
        rank: 2,
        title: `${gapBps} bps gap versus floor`,
        body: `Your current rate is ${profile.currentRate.toFixed(2)}%, while the snapshot floor for this lender and loan type is around ${pricing.floor.toFixed(2)}%. You are not asking for a below-market exception; you are asking to be moved closer to the lender's own stronger-profile slab.`,
        leverage: gapBps >= 60 ? "high" : "medium",
        sourceLabel: `${lender.name} published pricing`,
        sourceUrl: lender.rateCardUrl,
      },
      {
        rank: 3,
        title: `${profile.emisPaidOnTime} clean EMIs plus prepayments`,
        body: `You have paid ${profile.emisPaidOnTime} EMIs on time and prepaid ₹${profile.prepaymentsTotal.toLocaleString("en-IN")}. That reduces credit risk and gives the branch a retention reason to review your spread.`,
        leverage: profile.emisPaidOnTime >= 24 ? "high" : "medium",
        sourceLabel: "Borrower-provided repayment profile",
        sourceUrl: RATE_ENVIRONMENT.source,
      },
      ...(competitorGap != null && profile.competingOffer?.lender
        ? [
            {
              rank: 4,
              title: `${profile.competingOffer.lender} offer improves leverage`,
              body: `${profile.competingOffer.lender} is quoting about ${profile.competingOffer.rate?.toFixed(2)}%, a gap of roughly ${competitorGap.toFixed(2)} percentage points from your current rate. Tell ${profile.lender} you prefer staying, but need a retention rate close enough to avoid refinancing.`,
              leverage: "high" as const,
              sourceLabel: "Borrower-provided competing offer",
              sourceUrl: lender.rateCardUrl,
            },
          ]
        : [
            {
              rank: 4,
              title: "Get one competing quote before escalation",
              body: `If the first branch response is weak, get a written or pre-approved quote from SBI, HDFC, ICICI, Axis, or Kotak. A documented alternative is often stronger than a generic request for a lower rate.`,
              leverage: "medium" as const,
              sourceLabel: "RBI benchmark context",
              sourceUrl: RATE_ENVIRONMENT.source,
            },
          ]),
    ],
    emailDraft: {
      recipient: "Your branch Relationship Manager",
      subject: `Request for ${profile.lender} ${profile.loanType} loan interest rate review`,
      body: `Dear Relationship Manager,\n\nI request a review of my ${profile.lender} ${profile.loanType} loan interest rate. My current rate is ${profile.currentRate.toFixed(2)}%, with ₹${profile.principalOutstanding.toLocaleString("en-IN")} outstanding and ${profile.tenureRemainingMonths} months remaining.\n\nMy CIBIL score is ${profile.cibilScore}, I have paid ${profile.emisPaidOnTime} EMIs on time, and I have made prepayments of ₹${profile.prepaymentsTotal.toLocaleString("en-IN")}. Based on the current rate environment and my repayment profile, I request that my loan be moved closer to ${target.low.toFixed(2)}%–${target.high.toFixed(2)}%, or to the best applicable internal slab.\n\nPlease confirm the rate-card tier I currently map to, any conversion fee, and whether the fee can be waived or reduced.\n\nRegards,\n[Your Name]\n[Loan Account Number]\n[Branch]`,
    },
    phoneScript: {
      opening: `Hello, I am calling about my ${profile.lender} ${profile.loanType} loan. I have paid ${profile.emisPaidOnTime} EMIs on time and want to request a rate review rather than refinancing elsewhere.`,
      theAsk: `Please review my current ${profile.currentRate.toFixed(2)}% rate and move it closer to ${target.low.toFixed(2)}%–${target.high.toFixed(2)}%, or the best slab applicable to my CIBIL and employer profile.`,
      objectionResponses: [
        {
          ifTheyaSay: "This is the best rate we can offer.",
          youReply: `Could you please share which published slab my CIBIL ${profile.cibilScore} profile maps to? I am asking for the rate-card basis in writing so I can decide whether to continue or refinance.`,
        },
        {
          ifTheyaSay: "A conversion fee will apply.",
          youReply: `I understand. Please quote both the revised rate and the exact fee. Given my clean repayment and prepayments, can the fee be waived or reduced?`,
        },
        {
          ifTheyaSay: "You can transfer the loan if you want.",
          youReply: `I would prefer to stay with ${profile.lender}. If you can offer a fair retention rate, it avoids processing work for both sides.`,
        },
      ],
      closing: "Please email the revised rate, conversion fee, effective date, and next step. I will review and respond after comparing the net saving.",
    },
    assumptions: [
      `Demo fallback generated from the ${DOMAIN_SNAPSHOT_DATE} snapshot in this repository because the live model was unavailable or demo mode was enabled.`,
      "Rate-card floors are indicative and must be checked against the lender website before acting.",
      "The calculation assumes the borrower keeps the same remaining tenure and uses EMI reduction as the comparison basis.",
    ],
    confidence: getConfidence(profile),
    confidenceReason: `${profile.lender}, loan type, CIBIL, EMI track record, tenure, and income were available; confidence would improve with the exact loan account reset date and a written competing offer.`,
    nextSteps: [
      "Send the email to the branch RM and ask for the slab mapping in writing.",
      "Ask for the revised rate and conversion fee separately.",
      "Compare net savings after fees before accepting.",
      "If the response is weak, collect a written competing offer and escalate through the lender path.",
    ],
  };
}

export function buildDemoCounterPlan(args: {
  profile: LoanProfile;
  originalTargetLow: number;
  originalTargetHigh: number;
  rmReplyText: string;
}): CounterPlan {
  const { profile, originalTargetLow, originalTargetHigh, rmReplyText } = args;
  const rate = extractRate(rmReplyText);
  const lower = rmReplyText.toLowerCase();
  const accepted = rate != null && rate <= originalTargetHigh;
  const rejected = /cannot|can't|not possible|rejected|no change|best rate/i.test(rmReplyText);
  const askedForDocs = /document|statement|salary|cibil|sanction|proof/i.test(rmReplyText);
  const deflected = /later|get back|reviewing|under process|team will/i.test(rmReplyText);
  const partial = rate != null && rate > originalTargetHigh;
  const askRate = roundRate(Math.min(originalTargetHigh, Math.max(originalTargetLow, (originalTargetLow + originalTargetHigh) / 2)));

  const recommendedAction: CounterPlan["recommendedAction"] = accepted
    ? "accept"
    : partial
      ? "counter"
      : rejected && profile.cibilScore >= 750
        ? "escalate"
        : deflected || askedForDocs
          ? "counter"
          : "counter";

  return {
    rmStance: accepted
      ? "accepted"
      : partial
        ? "partial_offer"
        : askedForDocs
          ? "asked_for_docs"
          : deflected
            ? "deflected"
            : rejected || lower.length > 0
              ? "rejected"
              : "deflected",
    rmRateOffered: rate,
    rmFeesQuoted: extractFeeText(rmReplyText),
    recommendedAction,
    reasoning:
      rate != null
        ? `The RM's quoted ${rate.toFixed(2)}% is compared against your original target band of ${originalTargetLow.toFixed(2)}%–${originalTargetHigh.toFixed(2)}%. Because your current rate is ${profile.currentRate.toFixed(2)}% and your CIBIL is ${profile.cibilScore}, the next move should focus on net savings after fees, not just headline rate.`
        : `The RM did not give a concrete rate. With CIBIL ${profile.cibilScore} and ${profile.emisPaidOnTime} clean EMIs, ask for a written rate, fee, and slab mapping before accepting the response.`,
    counterOffer:
      recommendedAction === "accept"
        ? null
        : {
            askRate,
            counterReply: `Dear Relationship Manager,\n\nThank you for reviewing my request. Based on my CIBIL score of ${profile.cibilScore}, ${profile.emisPaidOnTime} on-time EMIs, and the original target band of ${originalTargetLow.toFixed(2)}%–${originalTargetHigh.toFixed(2)}%, I request one more review for a rate of ${askRate.toFixed(2)}% with the conversion fee waived or reduced.\n\nPlease also share the rate-card slab used for my profile and the net fee payable, if any, so I can make a decision.\n\nRegards,\n[Your Name]`,
          },
    escalationPath:
      recommendedAction === "escalate"
        ? [
            "Reply once more to the RM asking for slab mapping and fee details in writing.",
            `Escalate to ${getLender(profile.lender).escalationPath}.`,
            "Attach repayment record, CIBIL score, and any competing offer.",
          ]
        : null,
    watchOuts: [
      "Do not accept a lower rate without checking conversion fee and effective date.",
      "Ask whether the revised rate applies for the full reset cycle or only temporarily.",
      "Compare the net saving after GST and processing charges.",
    ],
  };
}

function getLender(lender: LoanProfile["lender"]) {
  return LENDER_RATE_CARDS[(lender in LENDER_RATE_CARDS ? lender : "Other") as LenderKey];
}

function getPricing(lender: ReturnType<typeof getLender>, loanType: LoanProfile["loanType"]) {
  if (loanType === "home") {
    return { floor: lender.homeLoan.eblrFloor, ceiling: lender.homeLoan.eblrCeiling };
  }
  if (loanType === "personal") return lender.personalLoan;
  if (loanType === "auto") return lender.autoLoan;
  return ADDITIONAL_LOAN_RATE_BENCHMARKS[loanType];
}

function getCibilBand(score: number) {
  return CIBIL_BANDS.find((band) => score >= band.min && score <= band.max) ?? CIBIL_BANDS.at(-1)!;
}

function getTargetRate(currentRate: number, floor: number, leverage: string) {
  const maxCut =
    leverage === "highest" ? 0.75 : leverage === "high" ? 0.6 : leverage === "moderate" ? 0.4 : 0.25;
  const low = roundRate(Math.max(floor, currentRate - maxCut));
  const high = roundRate(Math.max(low + 0.1, currentRate - 0.15));
  return { low, high };
}

function estimateSavings(profile: LoanProfile, targetRate: number) {
  const current = emi(profile.principalOutstanding, profile.currentRate, profile.tenureRemainingMonths);
  const revised = emi(profile.principalOutstanding, targetRate, profile.tenureRemainingMonths);
  const monthlyReduction = Math.max(0, Math.round(current - revised));
  return {
    monthlyReduction,
    totalInterestSaved: Math.max(0, Math.round(monthlyReduction * profile.tenureRemainingMonths)),
  };
}

function emi(principal: number, annualRate: number, months: number) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) return principal / months;
  return (principal * monthlyRate * (1 + monthlyRate) ** months) / ((1 + monthlyRate) ** months - 1);
}

function getConfidence(profile: LoanProfile): NegotiationPlan["confidence"] {
  if (profile.competingOffer?.rate && profile.cibilScore >= 780 && profile.emisPaidOnTime >= 24) {
    return "high";
  }
  if (profile.cibilScore >= 730 && profile.emisPaidOnTime >= 12) return "medium";
  return "low";
}

function roundRate(rate: number) {
  return Math.round(rate * 20) / 20;
}

function extractRate(text: string) {
  const match = text.match(/(?:rate|interest|offer|roi)?\D*(\d{1,2}(?:\.\d{1,2})?)\s*%/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value >= 1 && value <= 40 ? value : null;
}

function extractFeeText(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => /fee|charge|processing|conversion|gst/i.test(sentence));
  return sentences.length ? sentences.join(" ") : null;
}
