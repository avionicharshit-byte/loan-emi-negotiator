"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";

import { CounterSection } from "@/components/counter-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { negotiationPlanSchema, type LoanProfile, type NegotiationPlan } from "@/lib/schema";
import { buildShareUrl } from "@/lib/share";

type PartialArgument = Partial<NegotiationPlan["arguments"][number]>;
type PartialObjection = Partial<NegotiationPlan["phoneScript"]["objectionResponses"][number]>;

type Props = {
  profile: LoanProfile;
  onReset: () => void;
};

const inr = (n: number | undefined) =>
  typeof n === "number" ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—";

const pct = (n: number | undefined) =>
  typeof n === "number" ? `${n.toFixed(2)}%` : "—";

export function PlanView({ profile, onReset }: Props) {
  const { object, submit, isLoading, error } = useObject({
    api: "/api/negotiate",
    schema: negotiationPlanSchema,
  });

  const [editedEmail, setEditedEmail] = useState<string | null>(null);

  // overlayVisible stays true while loading AND for 500 ms after to let the
  // fade-out animation finish before the overlay unmounts.
  const [overlayVisible, setOverlayVisible] = useState(true);
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setOverlayVisible(false), 500);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    submit(profile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emailBody = editedEmail ?? object?.emailDraft?.body ?? "";

  const profileSummary = useMemo(
    () =>
      `${profile.lender} ${profile.loanType} loan · ${inr(profile.principalOutstanding)} @ ${profile.currentRate}% · ${profile.tenureRemainingMonths} months remaining`,
    [profile],
  );

  return (
    <div className="grid gap-6">
      {/* Full-screen loading overlay — covers the plan while data streams in.
          Fades out once loading is done and then unmounts, revealing the
          fully-populated plan with zero flicker. */}
      {overlayVisible && (
        <LoadingOverlay profile={profile} fading={!isLoading} />
      )}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your negotiation plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">{profileSummary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ShareButton profile={profile} />
          <Button variant="outline" onClick={onReset}>
            ← Start over
          </Button>
        </div>
      </header>

      {error && <ErrorCard error={error} onRetry={() => submit(profile)} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="min-h-[180px]">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Target rate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {pct(object?.targetRate?.low)}
              </span>
              <span className="text-muted-foreground">—</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {pct(object?.targetRate?.high)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              You&apos;re currently at {profile.currentRate}%
            </p>
            <div className="pt-2 min-h-[60px]">
              {object?.targetRate?.reasoning ? (
                <p className="text-sm text-foreground">{object.targetRate.reasoning}</p>
              ) : (
                <Skeleton lines={3} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[180px]">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              If you succeed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-semibold tracking-tight tabular-nums">
                  {inr(object?.savingsEstimate?.monthlyEmiReduction)}
                </div>
                <div className="text-xs text-muted-foreground">/month lower EMI</div>
              </div>
              <div>
                <div className="text-3xl font-semibold tracking-tight tabular-nums">
                  {inr(object?.savingsEstimate?.totalInterestSaved)}
                </div>
                <div className="text-xs text-muted-foreground">interest saved</div>
              </div>
            </div>
            <div className="pt-2 min-h-[24px]">
              {object?.savingsEstimate?.method ? (
                <p className="text-xs text-muted-foreground">{object.savingsEstimate.method}</p>
              ) : (
                <Skeleton lines={1} />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Negotiation arguments</CardTitle>
          <p className="text-sm text-muted-foreground">Ranked by leverage. Each cites a source.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Show skeletons while loading and no args yet */}
          {isLoading && !object?.arguments?.length && (
            <div className="grid gap-3">
              <ArgumentSkeleton />
              <ArgumentSkeleton />
              <ArgumentSkeleton />
            </div>
          )}
          {/* Show real args as they arrive */}
          {(object?.arguments ?? []).map((arg: PartialArgument | undefined, idx: number) =>
            arg ? (
              <div key={idx} className="grid gap-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">#{arg.rank ?? idx + 1}</span>
                  {arg.leverage && <LeverageBadge leverage={arg.leverage} />}
                  <span className="font-medium">{arg.title}</span>
                </div>
                <p className="text-sm text-muted-foreground">{arg.body}</p>
                {arg.sourceUrl && (
                  <a
                    href={arg.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline underline-offset-2"
                  >
                    Source: {arg.sourceLabel ?? arg.sourceUrl}
                  </a>
                )}
              </div>
            ) : null,
          )}
          {/* After loading done, if still no args, show empty skeletons */}
          {!isLoading && !object?.arguments?.length && (
            <div className="grid gap-3">
              <ArgumentSkeleton />
              <ArgumentSkeleton />
              <ArgumentSkeleton />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Draft email</CardTitle>
              <p className="text-sm text-muted-foreground">
                To: {object?.emailDraft?.recipient ?? "your branch RM"} · Edit before sending.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <GmailButton
                subject={object?.emailDraft?.subject ?? ""}
                body={emailBody}
              />
              <CopyButton text={`Subject: ${object?.emailDraft?.subject ?? ""}\n\n${emailBody}`} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Subject: </span>
            {object?.emailDraft?.subject ? (
              <span className="font-medium">{object.emailDraft.subject}</span>
            ) : (
              <span className="inline-block h-3 w-64 max-w-full animate-pulse rounded bg-muted align-middle" />
            )}
          </div>
          <Textarea
            value={emailBody}
            onChange={(e) => setEditedEmail(e.target.value)}
            rows={12}
            className="font-mono text-[13px] leading-relaxed"
            placeholder="The agent is writing your email…"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Phone script</CardTitle>
              <p className="text-sm text-muted-foreground">
                With objection handling — what to say if the RM pushes back.
              </p>
            </div>
            <CopyButton text={formatPhoneScript(object?.phoneScript)} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm min-h-[180px]">
          {object?.phoneScript ? (
            <>
              <ScriptBlock label="Opening" body={object.phoneScript.opening} />
              <ScriptBlock label="The ask" body={object.phoneScript.theAsk} />
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Objection handling
                </div>
                <div className="grid gap-3">
                  {(object.phoneScript.objectionResponses ?? []).map((o: PartialObjection | undefined, i: number) =>
                    o ? (
                      <div key={i} className="rounded-md border p-3">
                        <p className="text-xs text-muted-foreground">If they say:</p>
                        <p className="italic">&ldquo;{o.ifTheyaSay}&rdquo;</p>
                        <p className="mt-2 text-xs text-muted-foreground">You reply:</p>
                        <p>{o.youReply}</p>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>
              <ScriptBlock label="Closing" body={object.phoneScript.closing} />
            </>
          ) : (
            <Skeleton lines={6} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              What the agent assumed
            </CardTitle>
            {object?.confidence && <ConfidenceBadge level={object.confidence} />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm min-h-[80px]">
          {object?.confidenceReason && (
            <p className="text-muted-foreground">{object.confidenceReason}</p>
          )}
          {object?.assumptions?.length ? (
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {object.assumptions.map((a: string | undefined, i: number) => (a ? <li key={i}>{a}</li> : null))}
            </ul>
          ) : (
            <Skeleton lines={2} />
          )}
          {object?.nextSteps?.length ? (
            <>
              <Separator />
              <div>
                <div className="mb-2 font-medium text-foreground">Next steps</div>
                <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                  {object.nextSteps.map((s: string | undefined, i: number) => (s ? <li key={i}>{s}</li> : null))}
                </ol>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {!isLoading &&
        typeof object?.targetRate?.low === "number" &&
        typeof object?.targetRate?.high === "number" && (
          <CounterSection
            profile={profile}
            originalTargetLow={object.targetRate.low}
            originalTargetHigh={object.targetRate.high}
          />
        )}
    </div>
  );
}

function ErrorCard({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const parsed = useMemo(() => parseAgentError(error), [error]);

  return (
    <Card className="border-destructive/50 bg-destructive/[0.04]">
      <CardContent className="space-y-3 py-5">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-destructive" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="font-semibold tracking-tight text-destructive">{parsed.title}</h2>
            <p className="text-sm text-muted-foreground">{parsed.message}</p>
            {parsed.hint && (
              <p className="text-xs text-muted-foreground">{parsed.hint}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-5">
          <Button size="sm" onClick={onRetry}>
            Retry
          </Button>
          {parsed.docsUrl && (
            <a
              href={parsed.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline underline-offset-2"
            >
              {parsed.docsLabel ?? "Learn more"}
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function parseAgentError(error: Error): {
  title: string;
  message: string;
  hint?: string;
  docsUrl?: string;
  docsLabel?: string;
} {
  const raw = error.message ?? "";

  if (/RESOURCE_EXHAUSTED|quota|429|rate_limited/i.test(raw)) {
    return {
      title: "Gemini rate limit hit",
      message:
        "The free-tier rate limit was reached. The app automatically retried 3 times but the limit is still active. Please wait about 1 minute and click Retry.",
      hint:
        "This only happens during heavy bursts. Normal demo usage (one request every ~20 s) works fine on the free tier.",
      docsUrl: "https://ai.google.dev/gemini-api/docs/rate-limits",
      docsLabel: "Gemini rate limits →",
    };
  }

  if (/missing_api_key|GEMINI_API_KEY/i.test(raw)) {
    return {
      title: "API key missing",
      message: "Set GEMINI_API_KEY in .env.local and restart the dev server.",
      docsUrl: "https://aistudio.google.com/apikey",
      docsLabel: "Get a Gemini key →",
    };
  }

  if (/network|fetch|ECONNREFUSED|ENOTFOUND/i.test(raw)) {
    return {
      title: "Network error",
      message: "Couldn't reach the agent service. Check your connection and try again.",
    };
  }

  return {
    title: "Something went wrong",
    message: raw || "The agent failed unexpectedly. Please try again.",
  };
}

// ─── Loading overlay (full-screen) ──────────────────────────────────────────

function LoadingOverlay({ profile, fading }: { profile: LoanProfile; fading: boolean }) {
  const steps = useMemo(
    () => [
      `Reading your ${profile.lender} ${profile.loanType}-loan profile…`,
      `Mapping CIBIL ${profile.cibilScore} to ${profile.lender}'s rate-card tier…`,
      `Checking the published EBLR floor + RBI repo rate transmission…`,
      `Building your ranked negotiation arguments…`,
      `Drafting the email to your branch RM…`,
      `Composing the phone script with objection handling…`,
      `Finalizing assumptions and confidence flags…`,
    ],
    [profile],
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIdx((i) => (i + 1) % steps.length);
    }, 2200);
    const tickInterval = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => {
      clearInterval(stepInterval);
      clearInterval(tickInterval);
    };
  }, [steps.length]);

  // Cosmetic progress bar: asymptotes toward 92% over ~18 s, jumps to 100% when fading
  const progressPct = fading ? 100 : Math.min(92, Math.round(100 * (1 - Math.exp(-elapsed / 6))));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Generating your negotiation plan"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Frosted-glass dark backdrop
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: fading ? 0 : 1,
        transition: "opacity 500ms ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Dialog card */}
      <div
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "2.5rem 3rem",
          width: "min(620px, 92vw)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
          transform: fading ? "scale(0.97)" : "scale(1)",
          transition: "transform 500ms ease",
        }}
      >
        {/* Pulsing dot + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          <span style={{ position: "relative", marginTop: "0.3rem", display: "inline-flex", flexShrink: 0 }}>
            <span
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "9999px",
                background: "var(--primary)",
                opacity: 0.7,
                animation: "ping 1s cubic-bezier(0,0,0.2,1) infinite",
              }}
            />
            <span
              style={{
                position: "relative",
                width: "10px",
                height: "10px",
                borderRadius: "9999px",
                background: "var(--primary)",
                display: "inline-flex",
              }}
            />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
              <h2 style={{ fontWeight: 700, fontSize: "1.2rem", letterSpacing: "-0.02em", margin: 0 }}>
                Generating your negotiation plan
              </h2>
              <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--muted-foreground)", tabularNums: true } as React.CSSProperties}>
                {elapsed}s · usually 10–15s
              </span>
            </div>
            {/* Cycling step text */}
            <p
              key={stepIdx}
              style={{
                marginTop: "0.75rem",
                fontSize: "0.95rem",
                color: "var(--muted-foreground)",
                animation: "fadeInStep 0.4s ease",
              }}
            >
              {steps[stepIdx]}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            marginTop: "1.75rem",
            height: "8px",
            width: "100%",
            borderRadius: "9999px",
            background: "var(--muted)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              borderRadius: "9999px",
              background: "var(--primary)",
              width: `${progressPct}%`,
              transition: "width 700ms ease-out",
            }}
          />
        </div>

        {/* Helper text */}
        <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--muted-foreground)", textAlign: "center" }}>
          Analysing your loan profile and market data…
        </p>
      </div>

      {/* Keyframe styles injected inline */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        @keyframes fadeInStep {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ArgumentSkeleton() {
  return (
    <div className="grid gap-2 rounded-lg border border-border/60 p-4">
      <div className="flex items-center gap-2">
        <span className="h-3 w-6 animate-pulse rounded bg-muted" />
        <span className="h-4 w-12 animate-pulse rounded bg-muted" />
        <span className="h-3 w-40 animate-pulse rounded bg-muted" />
      </div>
      <span className="h-3 w-full animate-pulse rounded bg-muted" />
      <span className="h-3 w-5/6 animate-pulse rounded bg-muted" />
    </div>
  );
}

function ScriptBlock({ label, body }: { label: string; body?: string }) {
  if (!body) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <p>{body}</p>
    </div>
  );
}

function LeverageBadge({ leverage }: { leverage: "high" | "medium" | "low" }) {
  const variant = leverage === "high" ? "default" : leverage === "medium" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="uppercase">
      {leverage}
    </Badge>
  );
}

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  return (
    <Badge variant={level === "high" ? "default" : level === "medium" ? "secondary" : "outline"}>
      Confidence: {level}
    </Badge>
  );
}

function Skeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

function ShareButton({ profile }: { profile: LoanProfile }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          const url = buildShareUrl(profile);
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // ignore clipboard failures
        }
      }}
    >
      {copied ? "Link copied ✓" : "Share scenario"}
    </Button>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const disabled = !text.trim();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore — clipboard may be unavailable in some contexts
        }
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </Button>
  );
}

function GmailButton({ subject, body }: { subject: string; body: string }) {
  const disabled = !subject.trim() && !body.trim();

  const handleOpenGmail = () => {
    // Open Gmail compose as a small centred popup window (not a full tab).
    // Omit &fs=1 so Gmail starts in compact compose mode.
    const gmailUrl =
      "https://mail.google.com/mail/?view=cm" +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`;
    const w = 600;
    const h = 680;
    const left = Math.max(0, Math.round((screen.width  - w) / 2));
    const top  = Math.max(0, Math.round((screen.height - h) / 2));
    window.open(
      gmailUrl,
      "gmail_compose",
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`,
    );
  };

  return (
    <Button
      variant="default"
      size="sm"
      disabled={disabled}
      onClick={handleOpenGmail}
      className="gap-1.5"
    >
      {/* Official Gmail M logo */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path fill="#4caf50" d="M45 16.2l-5 2.75-5 4.75V40h7a3 3 0 003-3V16.2z" />
        <path fill="#1e88e5" d="M3 16.2l3.5 2.75L13 23.7V40H6a3 3 0 01-3-3V16.2z" />
        <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
        <path fill="#c62828" d="M3 12.298V16.2l10 7.5V11.2L9.876 8.859C9.132 8.301 8.228 8 7.298 8c-2.374 0-4.298 1.924-4.298 4.298z" />
        <path fill="#fbc02d" d="M45 12.298V16.2l-10 7.5V11.2l3.124-2.341C38.868 8.301 39.772 8 40.702 8c2.374 0 4.298 1.924 4.298 4.298z" />
      </svg>
      Open in Gmail
    </Button>
  );
}

function formatPhoneScript(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const s = input as {
    opening?: string;
    theAsk?: string;
    closing?: string;
    objectionResponses?: Array<{ ifTheyaSay?: string; youReply?: string } | undefined>;
  };
  const objections = (s.objectionResponses ?? [])
    .filter((o): o is { ifTheyaSay?: string; youReply?: string } => Boolean(o))
    .map((o) => `If they say: "${o.ifTheyaSay ?? ""}"\nYou reply: ${o.youReply ?? ""}`)
    .join("\n\n");
  return [
    `Opening: ${s.opening ?? ""}`,
    `The ask: ${s.theAsk ?? ""}`,
    objections ? `Objection handling:\n${objections}` : "",
    `Closing: ${s.closing ?? ""}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}
