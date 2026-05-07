import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 glow-top">
      <header className="border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="font-semibold tracking-tight">
            <span className="text-foreground">Loan</span>
            <span className="text-primary">.</span>
            <span className="text-foreground">Negotiator</span>
          </span>
          <Link
            href="/negotiate"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Try the agent →
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-20">
        <section className="max-w-3xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-secondary-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            For borrowers in India · Home, Personal &amp; Auto loans
          </p>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Stop overpaying on
            <br />
            your loan.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Most borrowers pay 0.5–1.5% above their lender&apos;s own published rate floor — simply because no one writes the email asking for a reset. This agent writes it for you, grounded in your profile and the lender&apos;s published rate card.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link href="/negotiate" className={buttonVariants({ size: "lg" })}>
              Generate my negotiation plan →
            </Link>
            <span className="text-sm text-muted-foreground">Takes about 90 seconds</span>
          </div>
        </section>

        <section className="mt-24 grid gap-5 md:grid-cols-3">
          <Step
            num="01"
            title="Share your loan profile"
            body="Principal, current rate, tenure remaining, CIBIL, prepayments, employer category. All inputs stay in your browser."
          />
          <Step
            num="02"
            title="Agent maps you to the rate card"
            body="Your CIBIL band, repayment history and lender's published EBLR floor become the negotiating wedge. Every number cites a source."
          />
          <Step
            num="03"
            title="Send the email or make the call"
            body="You get a 4-part artifact: target rate band, ranked arguments, draft email, phone script with objection handling. Edit before sending."
          />
        </section>

        <section className="mt-24 rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur-sm">
          <h2 className="text-xl font-semibold tracking-tight">Why this exists</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Most &quot;AI for finance&quot; tools surface information — they don&apos;t write the actual artifact. The leap from <em className="text-foreground/90 not-italic font-medium">informing</em> to <em className="text-foreground/90 not-italic font-medium">acting</em> is where trust is hardest, and where the product value is highest. This is a demo of that leap, applied to a problem most Indian borrowers face but rarely act on: an outdated interest rate.
          </p>
          <ul className="mt-5 grid gap-2.5 text-sm text-muted-foreground md:grid-cols-2">
            <Bullet>Every claim links to a public RBI / lender source.</Bullet>
            <Bullet>The agent shows its assumptions before you act.</Bullet>
            <Bullet>Nothing auto-sends. The human stays in the loop.</Bullet>
            <Bullet>Confidence is flagged when inputs are sparse.</Bullet>
          </ul>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-5 text-xs text-muted-foreground">
          <span>Snapshot data: May 2026 · Not financial advice · Verify rates with your lender before acting.</span>
        </div>
      </footer>
    </div>
  );
}

function Step({ num, title, body }: { num: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm transition-colors hover:border-primary/40">
      <div className="font-mono text-xs tracking-widest text-primary">{num}</div>
      <h3 className="mt-3 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}
