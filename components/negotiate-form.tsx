"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import type { Path } from "react-hook-form";
import { useForm } from "react-hook-form";

import { UploadStatement } from "@/components/upload-statement";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEMO_PROFILES } from "@/lib/demo";
import type { ExtractedLoanData } from "@/lib/extract-schema";
import {
  EMPLOYER_CATEGORIES,
  LENDERS,
  LOAN_TYPE_LABELS,
  LOAN_TYPES,
  loanProfileSchema,
  type LoanProfile,
} from "@/lib/schema";

type Props = {
  onSubmit: (profile: LoanProfile) => void;
  initialProfile?: LoanProfile | null;
};

const EXTRACTABLE_FIELDS: Array<keyof LoanProfile> = [
  "loanType",
  "lender",
  "principalOutstanding",
  "currentRate",
  "tenureRemainingMonths",
  "currentEMI",
  "sanctionDate",
  "cibilScore",
  "emisPaidOnTime",
  "prepaymentsTotal",
  "monthlyIncome",
  "employerCategory",
];

const DEFAULT: Partial<LoanProfile> = {
  loanType: "personal",
  lender: "Other",
  principalOutstanding: 900000,
  currentRate: 14.5,
  tenureRemainingMonths: 48,
  currentEMI: 24800,
  sanctionDate: "2024-04",
  cibilScore: 735,
  emisPaidOnTime: 14,
  prepaymentsTotal: 50000,
  monthlyIncome: 125000,
  employerCategory: "Private (unlisted)",
};

const PROFILE_FIELDS: Array<Path<LoanProfile>> = [
  "loanType",
  "lender",
  "principalOutstanding",
  "currentRate",
  "tenureRemainingMonths",
  "currentEMI",
  "sanctionDate",
  "cibilScore",
  "emisPaidOnTime",
  "prepaymentsTotal",
  "monthlyIncome",
  "employerCategory",
  "competingOffer.lender",
  "competingOffer.rate",
  "additionalContext",
];

export function NegotiateForm({ onSubmit, initialProfile }: Props) {
  const form = useForm<LoanProfile>({
    resolver: zodResolver(loanProfileSchema),
    defaultValues: initialProfile ?? DEFAULT,
    mode: "onTouched",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const [autofilled, setAutofilled] = useState<Set<keyof LoanProfile>>(new Set());
  const [loadedDemo, setLoadedDemo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  function handleExtracted(data: ExtractedLoanData) {
    const filled = new Set<keyof LoanProfile>();
    for (const key of EXTRACTABLE_FIELDS) {
      const value = data[key as keyof ExtractedLoanData];
      if (value == null || value === "") continue;
      setValue(key as Path<LoanProfile>, value as never, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
      filled.add(key);
    }
    setAutofilled(filled);
    setLoadedDemo(null);
  }

  function applyDemoProfile(label: string, profile: LoanProfile) {
    reset(profile);
    for (const field of PROFILE_FIELDS) {
      const value = field.split(".").reduce<unknown>((acc, part) => {
        if (acc && typeof acc === "object" && part in acc) {
          return (acc as Record<string, unknown>)[part];
        }
        return undefined;
      }, profile);

      const nextValue =
        value === undefined && (field === "competingOffer.lender" || field === "additionalContext")
          ? ""
          : value;

      setValue(field, nextValue as never, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
    setAutofilled(new Set());
    setLoadedDemo(label);
  }

  const af = (k: keyof LoanProfile) => autofilled.has(k);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-8 rounded-xl border bg-card p-6 md:p-8"
    >
      <header className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your loan profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your loan statement to auto-fill, or fill in manually. The defaults below are an illustrative profile.
          </p>
          {initialProfile && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              Loaded from a shared link · review and click Generate
            </p>
          )}
        </div>
        <div className="rounded-lg border border-dashed bg-secondary/20 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Demo profiles</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Use these when API quota is tight or you need a reliable walkthrough.
              </p>
              {loadedDemo && (
                <p className="mt-2 inline-flex rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  Loaded: {loadedDemo}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {DEMO_PROFILES.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  applyDemoProfile(sample.label, sample.profile);
                }}
                className="rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="block font-medium">{sample.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {sample.description}
                </span>
              </button>
            ))}
          </div>
        </div>
        <UploadStatement onExtracted={handleExtracted} />
      </header>

      <Section title="Loan basics">
        <Field label="Loan type" error={errors.loanType?.message} autofilled={af("loanType")}>
          <select
            {...register("loanType")}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {LOAN_TYPES.map((t) => (
              <option key={t} value={t}>
                {LOAN_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Lender" error={errors.lender?.message} autofilled={af("lender")}>
          <select
            {...register("lender")}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {LENDERS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Principal outstanding (₹)" error={errors.principalOutstanding?.message} autofilled={af("principalOutstanding")}>
          <Input type="number" step="1000" {...register("principalOutstanding", { valueAsNumber: true })} />
        </Field>
        <Field label="Current rate (%)" error={errors.currentRate?.message} autofilled={af("currentRate")}>
          <Input type="number" step="0.01" {...register("currentRate", { valueAsNumber: true })} />
        </Field>
        <Field label="Tenure remaining (months)" error={errors.tenureRemainingMonths?.message} autofilled={af("tenureRemainingMonths")}>
          <Input type="number" {...register("tenureRemainingMonths", { valueAsNumber: true })} />
        </Field>
        <Field label="Current EMI (₹)" error={errors.currentEMI?.message} autofilled={af("currentEMI")}>
          <Input type="number" step="100" {...register("currentEMI", { valueAsNumber: true })} />
        </Field>
        <Field label="Loan sanction date" error={errors.sanctionDate?.message} autofilled={af("sanctionDate")}>
          <Input type="month" {...register("sanctionDate")} />
        </Field>
      </Section>

      <Section title="Your profile">
        <Field label="CIBIL score" error={errors.cibilScore?.message} autofilled={af("cibilScore")}>
          <Input type="number" {...register("cibilScore", { valueAsNumber: true })} />
        </Field>
        <Field label="On-time EMIs paid" error={errors.emisPaidOnTime?.message} autofilled={af("emisPaidOnTime")}>
          <Input type="number" {...register("emisPaidOnTime", { valueAsNumber: true })} />
        </Field>
        <Field label="Prepayments made (total ₹)" error={errors.prepaymentsTotal?.message} autofilled={af("prepaymentsTotal")}>
          <Input type="number" step="1000" {...register("prepaymentsTotal", { valueAsNumber: true })} />
        </Field>
        <Field label="Monthly income (₹)" error={errors.monthlyIncome?.message} autofilled={af("monthlyIncome")}>
          <Input type="number" step="1000" {...register("monthlyIncome", { valueAsNumber: true })} />
        </Field>
        <Field label="Employer category" error={errors.employerCategory?.message} autofilled={af("employerCategory")}>
          <select
            {...register("employerCategory")}
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
          >
            {EMPLOYER_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Optional — sharpens the plan">
        <Field label="Competing offer lender (optional)">
          <Input placeholder="e.g., ICICI" {...register("competingOffer.lender")} />
        </Field>
        <Field label="Competing offer rate (%, optional)">
          <Input
            type="number"
            step="0.01"
            placeholder="e.g., 8.55"
            {...register("competingOffer.rate", {
              setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
            })}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="Anything else relevant? (optional)">
            <Textarea
              placeholder="e.g., I have salary account + FDs with the same bank for 6 years."
              {...register("additionalContext")}
            />
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <p className="text-xs text-muted-foreground">
          Your inputs stay in your browser. Only the profile is sent to the model API.
        </p>
        <Button type="submit" size="lg" disabled={isSubmitting}>
          Generate plan →
        </Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  error,
  autofilled,
  children,
}: {
  label: string;
  error?: string;
  autofilled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {autofilled && (
          <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            Auto-filled
          </span>
        )}
      </div>
      {children}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
