"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { negotiationPlanSchema, type LoanProfile, type NegotiationPlan } from "@/lib/schema";

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
        <Button variant="outline" onClick={onReset}>
          ← Start over
        </Button>
      </header>

      {error && (
        <Card className="border-destructive">
          <CardContent>
            <p className="text-sm text-destructive">
              The agent ran into an error: {error.message}. Check that your Gemini API key is set as
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">GEMINI_API_KEY</code>
              in <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">.env.local</code>
              and try again.
            </p>
          </CardContent>
        </Card>
      )}

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
            <p className="pt-2 text-sm text-foreground">
              {object?.targetRate?.reasoning ?? <Skeleton lines={3} />}
            </p>
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
            <p className="pt-2 text-xs text-muted-foreground">
              {object?.savingsEstimate?.method ?? <Skeleton lines={1} />}
            </p>
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
          {!object?.arguments?.length && <Skeleton lines={4} />}
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
            <span className="font-medium">
              {object?.emailDraft?.subject ?? <Skeleton lines={1} />}
            </span>
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

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          Streaming plan…
        </div>
      )}
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
