import Link from "next/link";

import { NegotiateApp } from "@/components/negotiate-app";

export default function NegotiatePage() {
  return (
    <div className="flex flex-col flex-1 glow-top">
      <header className="border-b border-border/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-semibold tracking-tight transition-opacity hover:opacity-80"
          >
            ← <span className="text-foreground">Loan</span>
            <span className="text-primary">.</span>
            <span className="text-foreground">Negotiator</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <NegotiateApp />
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 text-xs text-muted-foreground">
          <span>Snapshot data: May 2026 · Not financial advice.</span>
        </div>
      </footer>
    </div>
  );
}
