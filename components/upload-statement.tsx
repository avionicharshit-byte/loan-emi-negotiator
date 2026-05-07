"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import type { ExtractedLoanData } from "@/lib/extract-schema";

type Props = {
  onExtracted: (data: ExtractedLoanData) => void;
};

type Status =
  | { kind: "idle" }
  | { kind: "extracting"; fileName: string }
  | { kind: "done"; data: ExtractedLoanData; fileName: string }
  | { kind: "error"; message: string };

export function UploadStatement({ onExtracted }: Props) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setStatus({ kind: "extracting", fileName: file.name });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        const msg = json?.error?.message ?? `Extraction failed (${res.status})`;
        setStatus({ kind: "error", message: msg });
        return;
      }

      const data = json.data as ExtractedLoanData;
      setStatus({ kind: "done", data, fileName: file.name });
      onExtracted(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Network error during upload.";
      setStatus({ kind: "error", message });
    }
  }

  function reset() {
    setStatus({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  const filledCount =
    status.kind === "done"
      ? Object.entries(status.data).filter(
          ([key, value]) =>
            value != null && value !== "" && key !== "documentTypeDetected" && key !== "notes",
        ).length
      : 0;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
              <UploadIcon />
            </span>
            <h2 className="text-sm font-semibold tracking-tight">Have a loan statement?</h2>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Upload an image or PDF and the agent will pre-fill the form. You always review before generating.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      {status.kind === "idle" && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            Choose a file
          </Button>
          <span className="text-xs text-muted-foreground">JPEG, PNG, WebP, or PDF · up to 8 MB</span>
        </div>
      )}

      {status.kind === "extracting" && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/60 bg-card/60 p-3">
          <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{status.fileName}</p>
            <p className="text-xs text-muted-foreground">Reading the document with Gemini…</p>
          </div>
        </div>
      )}

      {status.kind === "done" && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border/60 bg-card/60 p-3">
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium">{status.fileName}</p>
              <p className="text-xs text-muted-foreground">
                Detected: {status.data.documentTypeDetected}
              </p>
            </div>
            <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {filledCount} field{filledCount === 1 ? "" : "s"} filled
            </span>
          </div>
          {status.data.notes && (
            <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/90">Agent note:</span> {status.data.notes}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Review the form below — the agent guesses are highlighted. Edit anything that&apos;s wrong before generating your plan.
          </p>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={reset}>
              Upload a different file
            </Button>
          </div>
        </div>
      )}

      {status.kind === "error" && (
        <div className="mt-4 space-y-2">
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {status.message}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
