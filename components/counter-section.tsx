"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { counterPlanSchema, type LoanProfile } from "@/lib/schema";

type Props = {
  profile: LoanProfile;
  originalTargetLow: number;
  originalTargetHigh: number;
};

export function CounterSection({ profile, originalTargetLow, originalTargetHigh }: Props) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");

  const { object, submit, isLoading, error } = useObject({
    api: "/api/counter",
    schema: counterPlanSchema,
  });

  const hasResult = !!object?.recommendedAction;

  function onSubmit() {
    if (reply.trim().length < 10) return;
    submit({
      profile,
      originalTargetLow,
      originalTargetHigh,
      rmReplyText: reply.trim(),
    });
  }

  if (!open) {
    return (
      <Card className="border-dashed border-primary/30 bg-primary/[0.02]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-5">
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight">Got a reply from your RM?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste their response — the agent will tell you whether to accept, counter, escalate, or walk away.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>Analyze the reply →</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>What the RM said back</CardTitle>
            <p className="text-sm text-muted-foreground">
              Paste the RM&apos;s email or what they told you over the phone. Verbatim is best.
            </p>
          </div>
          {!isLoading && !hasResult && (
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={6}
          placeholder={`e.g., "Thank you for your email. We have reviewed your account. The best we can offer is 9.00%, with a conversion fee of 0.50% + GST. Please let us know if you'd like to proceed."`}
          disabled={isLoading}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onSubmit} disabled={isLoading || reply.trim().length < 10}>
            {isLoading ? "Analyzing…" : hasResult ? "Re-analyze" : "Tell me what to do"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Reference target was {originalTargetLow.toFixed(2)}% – {originalTargetHigh.toFixed(2)}%.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error.message ?? "The agent failed. Try again in a moment."}
          </div>
        )}

        {(isLoading || hasResult) && (
          <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              {object?.rmStance && <StanceBadge stance={object.rmStance} />}
              {object?.recommendedAction && <ActionBadge action={object.recommendedAction} />}
              {object?.rmRateOffered != null && (
                <span className="text-xs text-muted-foreground">
                  RM offered: <span className="font-medium text-foreground">{object.rmRateOffered.toFixed(2)}%</span>
                </span>
              )}
            </div>

            {object?.reasoning && (
              <p className="text-sm text-muted-foreground">{object.reasoning}</p>
            )}

            {object?.rmFeesQuoted && (
              <p className="text-xs">
                <span className="text-muted-foreground">Fees mentioned: </span>
                <span>{object.rmFeesQuoted}</span>
              </p>
            )}

            {object?.counterOffer && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Counter ask
                  </div>
                  <p className="mt-1 text-sm">
                    Push for{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {typeof object.counterOffer.askRate === "number"
                        ? `${object.counterOffer.askRate.toFixed(2)}%`
                        : "—"}
                    </span>
                  </p>
                </div>
                {object.counterOffer.counterReply && (
                  <div>
                    <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Suggested reply
                    </div>
                    <pre className="whitespace-pre-wrap rounded-md border bg-card/60 p-3 font-mono text-[13px] leading-relaxed">
                      {object.counterOffer.counterReply}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {object?.escalationPath && object.escalationPath.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Escalation path
                  </div>
                  <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                    {object.escalationPath.map((step: string | undefined, i: number) =>
                      step ? <li key={i}>{step}</li> : null,
                    )}
                  </ol>
                </div>
              </div>
            )}

            {object?.watchOuts && object.watchOuts.length > 0 && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Watch out for
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {object.watchOuts.map((w: string | undefined, i: number) =>
                      w ? <li key={i}>{w}</li> : null,
                    )}
                  </ul>
                </div>
              </div>
            )}

            {isLoading && !hasResult && (
              <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                Reading the reply and choosing the best move…
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StanceBadge({ stance }: { stance: string }) {
  const labels: Record<string, string> = {
    accepted: "Accepted",
    partial_offer: "Partial offer",
    rejected: "Rejected",
    deflected: "Deflected",
    asked_for_docs: "Asked for docs",
  };
  const variant =
    stance === "accepted" ? "default" : stance === "rejected" ? "destructive" : "secondary";
  return (
    <Badge variant={variant as "default" | "destructive" | "secondary"}>
      RM stance: {labels[stance] ?? stance}
    </Badge>
  );
}

function ActionBadge({ action }: { action: string }) {
  const labels: Record<string, string> = {
    accept: "Accept",
    counter: "Counter",
    escalate: "Escalate",
    walk_away: "Walk away (refinance)",
  };
  const variant =
    action === "accept" ? "default" : action === "walk_away" ? "destructive" : "secondary";
  return (
    <Badge variant={variant as "default" | "destructive" | "secondary"} className="uppercase">
      Recommended: {labels[action] ?? action}
    </Badge>
  );
}
