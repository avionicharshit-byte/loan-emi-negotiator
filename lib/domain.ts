export const DOMAIN_SNAPSHOT_DATE = "May 2026";

export const RATE_ENVIRONMENT = {
  rbiRepoRate: 5.5,
  rbiRepoRateNote:
    "RBI repo rate stands at 5.50% (May 2026), down from 6.50% in early 2025. Most banks linked floating retail loans to EBLR (External Benchmark Lending Rate) which moves with repo. Transmission of repo cuts to existing borrowers is typically slow — borrowers must request resets.",
  source: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
};

export const LENDER_RATE_CARDS = {
  HDFC: {
    name: "HDFC Bank",
    homeLoan: { eblrFloor: 8.45, eblrCeiling: 9.4, premiumTierCutoff: 800 },
    personalLoan: { floor: 10.5, ceiling: 22.0 },
    autoLoan: { floor: 8.7, ceiling: 11.5 },
    notes:
      "HDFC publishes spread above repo on their website. Premium tier (CIBIL 800+, salaried, MNC/listed company) gets EBLR floor. Has a dedicated 'rate review' process — borrowers can apply via netbanking. Charges a conversion fee of 0.50% + GST to reset rate on existing loans (negotiable).",
    rateCardUrl: "https://www.hdfcbank.com/personal/borrow/popular-loans/home-loan/home-loan-interest-rate",
    escalationPath: "Branch RM → Regional Credit Manager → grievance@hdfcbank.com",
  },
  SBI: {
    name: "State Bank of India",
    homeLoan: { eblrFloor: 8.25, eblrCeiling: 9.25, premiumTierCutoff: 750 },
    personalLoan: { floor: 11.0, ceiling: 14.0 },
    autoLoan: { floor: 8.6, ceiling: 10.5 },
    notes:
      "SBI offers the lowest floor among major lenders. Government employees and defense personnel get an additional 0.05–0.10% concession. SBI's 'YONO' app has a rate-reset request flow. Conversion fee is 0.35% + GST, often waived during festive promotions.",
    rateCardUrl: "https://sbi.co.in/web/interest-rates/interest-rates/loan-schemes-interest-rates/home-loans-interest-rates",
    escalationPath: "Branch → Regional Business Office → customercare@sbi.co.in",
  },
  ICICI: {
    name: "ICICI Bank",
    homeLoan: { eblrFloor: 8.55, eblrCeiling: 9.5, premiumTierCutoff: 780 },
    personalLoan: { floor: 10.75, ceiling: 19.0 },
    autoLoan: { floor: 8.85, ceiling: 11.75 },
    notes:
      "ICICI is more aggressive on retention — likely to match competitor offers if you produce a sanction letter. Their 'iMobile' app has an 'interest rate review' tile. Conversion fee 0.50% + GST but commonly waived for CIBIL 780+ customers with 12+ months of clean repayment.",
    rateCardUrl: "https://www.icicibank.com/personal-banking/loans/home-loan/home-loan-interest-rates",
    escalationPath: "Branch RM → Customer Service → headservicequality@icicibank.com",
  },
  Other: {
    name: "Other lender",
    homeLoan: { eblrFloor: 8.6, eblrCeiling: 9.6, premiumTierCutoff: 780 },
    personalLoan: { floor: 11.0, ceiling: 22.0 },
    autoLoan: { floor: 8.9, ceiling: 12.0 },
    notes:
      "Use industry-average benchmarks. Recommend borrower obtain a written sanction from a top-3 lender (SBI/HDFC/ICICI) as leverage.",
    rateCardUrl: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
    escalationPath: "Branch RM → Nodal officer → RBI Banking Ombudsman (if unresolved 30 days)",
  },
} as const;

export const CIBIL_BANDS = [
  { min: 800, max: 900, label: "Excellent", expectedSpreadOverEBLR: 0.0, leverage: "highest" },
  { min: 750, max: 799, label: "Very Good", expectedSpreadOverEBLR: 0.15, leverage: "high" },
  { min: 700, max: 749, label: "Good", expectedSpreadOverEBLR: 0.4, leverage: "moderate" },
  { min: 650, max: 699, label: "Fair", expectedSpreadOverEBLR: 0.85, leverage: "low" },
  { min: 0, max: 649, label: "Poor", expectedSpreadOverEBLR: 1.5, leverage: "minimal" },
] as const;

export const NEGOTIATION_PLAYBOOK = {
  highLeverageSignals: [
    "CIBIL score 780+ (premium tier on most lender grids)",
    "12+ consecutive on-time EMIs (proves low-risk profile)",
    "Prepayments made (proves financial discipline + reduces lender's expected return)",
    "Salaried at MNC, listed company, or PSU (lender's preferred employer category)",
    "Loan tenure >5 years remaining (lender wants to retain long-term interest)",
    "Existing relationship: salary account, FD, mutual fund SIPs with same bank",
    "Documented competing offer (sanction letter from another bank at lower rate)",
    "Repo rate has been cut since loan sanction but rate not yet reset (transmission gap)",
  ],
  argumentTemplates: {
    repoTransmission:
      "RBI has cut repo rate by {bps} bps since my loan sanction in {sanctionDate}, but my rate has not been reset accordingly. Per the EBLR-linked structure, this should reflect within the next reset cycle.",
    creditProfile:
      "My CIBIL score of {cibil} places me in the {band} band, where {lender}'s published rate card offers a floor of {floor}%. My current rate of {currentRate}% is significantly above this benchmark.",
    repaymentTrack:
      "I have paid {emisPaid} EMIs on time with zero defaults and made prepayments totaling ₹{prepayments}, demonstrating low credit risk.",
    competingOffer:
      "I have received a preliminary indication from {competitor} at approximately {competitorRate}%. I would prefer to continue with {lender} given our existing relationship, but the rate gap of ~{gap}% over the remaining tenure is significant.",
  },
  objectionHandling: {
    "this is the best rate we can offer":
      "Politely ask for the basis. 'Could you share which tier on your published rate card my profile maps to? My CIBIL is X and I'm in the {employer} category — per your website that should map to {tier}.' This forces RM to either justify in writing or escalate.",
    "we'll charge a conversion fee":
      "Acknowledge, then negotiate the fee separately from the rate. 'I understand there's a 0.50% conversion fee. Can that be waived given my {emisPaid}-EMI clean track record? Many banks waive this for premium-tier customers.' If not waived, calculate whether the rate cut still nets positive over remaining tenure (it almost always does for 5+ years remaining).",
    "rates have moved up, not down":
      "Counter with the EBLR data. 'EBLR is linked to repo rate, which is currently {repoRate}%. Your published EBLR floor is {floor}% — I'm asking to be moved closer to that floor, not below the benchmark.'",
    "you can refinance with another bank if you want":
      "Treat as an opening. 'I'd prefer not to. The processing time and fees for refinancing aren't worth it for both of us. Can we find a middle ground that keeps me as a customer?' Most RMs are measured on retention.",
  },
  realisticTargetRange: (currentRate: number, eblrFloor: number, cibilLeverage: string) => {
    const gap = currentRate - eblrFloor;
    const realisticCutBps =
      cibilLeverage === "highest" ? Math.min(gap * 100, 75) :
      cibilLeverage === "high" ? Math.min(gap * 100, 60) :
      cibilLeverage === "moderate" ? Math.min(gap * 100, 40) :
      Math.min(gap * 100, 25);
    return {
      targetLow: Math.max(eblrFloor, currentRate - realisticCutBps / 100 - 0.1),
      targetHigh: currentRate - 0.15,
    };
  },
};

export const TRUST_RULES = `
  Trust rules — these are non-negotiable for every output:
  1. Never invent specific rate numbers beyond the snapshot data above. If unsure, give a range and label it "indicative".
  2. Always cite the source URL when referencing a published rate card or RBI rate.
  3. Acknowledge data sparsity. If the user provides incomplete profile data, mark confidence as "low" and explicitly list which inputs would sharpen the plan.
  4. Never tell the user a guaranteed outcome. Negotiation is probabilistic. Use phrases like "you have a credible case for", "based on similar profiles", "the lender is more likely to consider".
  5. The email must be respectful, factual, and short (under 200 words). Indian banking RMs respond better to concise, specific, deferential emails than to demanding ones.
  6. The phone script must include exact handoffs: opening line, the ask, anticipated objections with verbatim responses.
  7. Never recommend the user lie or manufacture competing offers. If they don't have one, suggest where to credibly obtain one (paisabazaar.com / bankbazaar.com pre-approved offers).
`.trim();

export function buildSystemPrompt(): string {
  const lenderSummary = (Object.values(LENDER_RATE_CARDS) as Array<typeof LENDER_RATE_CARDS[keyof typeof LENDER_RATE_CARDS]>)
    .map(
      (l) =>
        `${l.name}: home-loan EBLR ${l.homeLoan.eblrFloor}–${l.homeLoan.eblrCeiling}%, personal-loan ${l.personalLoan.floor}–${l.personalLoan.ceiling}%, auto-loan ${l.autoLoan.floor}–${l.autoLoan.ceiling}%. Rate card: ${l.rateCardUrl}. Escalation: ${l.escalationPath}. Notes: ${l.notes}`,
    )
    .join("\n\n");

  const cibilSummary = CIBIL_BANDS.map(
    (b) =>
      `${b.min}–${b.max} (${b.label}): expected spread over EBLR ~${b.expectedSpreadOverEBLR}%, negotiation leverage ${b.leverage}.`,
  ).join("\n");

  return `You are a loan rate-negotiation specialist for Indian retail borrowers. You produce a personalized, grounded negotiation plan from a borrower's loan profile.

DATA SNAPSHOT (as of ${DOMAIN_SNAPSHOT_DATE}):
RBI repo rate: ${RATE_ENVIRONMENT.rbiRepoRate}%. ${RATE_ENVIRONMENT.rbiRepoRateNote}
Source: ${RATE_ENVIRONMENT.source}

LENDER RATE CARDS:
${lenderSummary}

CIBIL BANDS:
${cibilSummary}

NEGOTIATION PRINCIPLES:
High-leverage signals to look for in the borrower's profile:
${NEGOTIATION_PLAYBOOK.highLeverageSignals.map((s) => `- ${s}`).join("\n")}

${TRUST_RULES}

Your output must follow the provided JSON schema exactly. Generate everything in Indian English. Currency in ₹. Be specific to the borrower's lender, profile, and current rate — never generic.`;
}
