"use client";

import { useEffect, useState } from "react";

import { NegotiateForm } from "@/components/negotiate-form";
import { PlanView } from "@/components/plan-view";
import { readSharedProfileFromLocation } from "@/lib/share";
import type { LoanProfile } from "@/lib/schema";

export function NegotiateApp() {
  const [profile, setProfile] = useState<LoanProfile | null>(null);
  const [sharedProfile, setSharedProfile] = useState<LoanProfile | null>(null);

  useEffect(() => {
    const loaded = readSharedProfileFromLocation();
    if (!loaded) return;
    const id = window.setTimeout(() => setSharedProfile(loaded), 0);
    return () => window.clearTimeout(id);
  }, []);

  if (!profile) {
    return <NegotiateForm onSubmit={setProfile} initialProfile={sharedProfile} />;
  }

  return <PlanView profile={profile} onReset={() => setProfile(null)} />;
}
