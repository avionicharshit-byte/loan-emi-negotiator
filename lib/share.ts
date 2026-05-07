import { loanProfileSchema, type LoanProfile } from "./schema";

const SHARE_PARAM = "p";

function toBase64Url(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(str: string): string {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(b64)));
}

export function encodeProfileToUrl(profile: LoanProfile): string {
  const minimal: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(profile)) {
    if (v == null || v === "") continue;
    minimal[k] = v;
  }
  return toBase64Url(JSON.stringify(minimal));
}

export function decodeProfileFromUrl(encoded: string): LoanProfile | null {
  try {
    const json = JSON.parse(fromBase64Url(encoded));
    const parsed = loanProfileSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readSharedProfileFromLocation(): LoanProfile | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get(SHARE_PARAM);
  if (!encoded) return null;
  return decodeProfileFromUrl(encoded);
}

export function buildShareUrl(profile: LoanProfile, originPath = "/negotiate"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const encoded = encodeProfileToUrl(profile);
  return `${origin}${originPath}?${SHARE_PARAM}=${encoded}`;
}

export { SHARE_PARAM };
