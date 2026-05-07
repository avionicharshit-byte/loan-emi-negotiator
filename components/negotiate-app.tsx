"use client";

import { useState } from "react";

import { NegotiateForm } from "@/components/negotiate-form";
import { PlanView } from "@/components/plan-view";
import type { LoanProfile } from "@/lib/schema";

export function NegotiateApp() {
  const [profile, setProfile] = useState<LoanProfile | null>(null);

  if (!profile) {
    return <NegotiateForm onSubmit={setProfile} />;
  }

  return <PlanView profile={profile} onReset={() => setProfile(null)} />;
}
