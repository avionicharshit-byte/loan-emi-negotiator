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

      {isLoading && <LoadingBanner profile={profile} />}

      {error && <ErrorCard error={error} onRetry={() => submit(profile)} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
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
            {object?.targetRate?.reasoning ? (
              <p className="pt-2 text-sm text-foreground">{object.targetRate.reasoning}</p>
            ) : (
              <div className="pt-2">
                <Skeleton lines={3} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
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
            {object?.savingsEstimate?.method ? (
              <p className="pt-2 text-xs text-muted-foreground">{object.savingsEstimate.method}</p>
            ) : (
              <div className="pt-2">
                <Skeleton lines={1} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Negotiation arguments</CardTitle>
          <p className="text-sm text-muted-foreground">Ranked by leverage. Each cites a source.</p>
        </CardHeader>
        <CardContent className="space-y-4">
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
          {!object?.arguments?.length && (
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
            <CopyButton text={`Subject: ${object?.emailDraft?.subject ?? ""}\n\n${emailBody}`} />
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
        <CardContent className="space-y-4 text-sm">
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
        <CardContent className="space-y-3 text-sm">
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

  if (/RESOURCE_EXHAUSTED|quota|429/i.test(raw)) {
    const retryMatch = raw.match(/retry in ([\d.]+)\s*s/i);
    const retrySec = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
    return {
      title: "Daily free quota reached",
      message: retrySec
        ? `You've hit Gemini's free-tier daily limit. Try again in ~${retrySec} seconds, or wait for the daily reset.`
        : "You've hit Gemini's free-tier daily limit. Try again in a few seconds, or wait for the daily reset.",
      hint:
        "Tip: switch to gemini-2.5-flash-lite (default) for higher free-tier limits, or enable billing on your Google AI project for production usage.",
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

function LoadingBanner({ profile }: { profile: LoanProfile }) {
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

  // Cosmetic progress bar that asymptotes toward 92% over ~18s; never reaches 100% until streaming completes
  const progressPct = Math.min(92, Math.round(100 * (1 - Math.exp(-elapsed / 6))));

  return (
    <Card className="border-primary/30 bg-primary/[0.03]">
      <CardContent className="space-y-4 py-5">
        <div className="flex items-start gap-3">
          <span className="relative mt-1 inline-flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold tracking-tight">Generating your negotiation plan</h2>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {elapsed}s · usually 10–15s
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground transition-opacity">
              <span className="text-foreground/90">{steps[stepIdx]}</span>
            </p>
          </div>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-muted/50">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </CardContent>
    </Card>
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
