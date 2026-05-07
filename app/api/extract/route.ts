import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";

import { EXTRACT_SYSTEM_PROMPT, extractedLoanDataSchema } from "@/lib/extract-schema";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return jsonError(500, "missing_api_key", "GEMINI_API_KEY is not set.");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, "invalid_form", "Expected multipart form data.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "missing_file", "No file uploaded.");
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(
      415,
      "unsupported_type",
      `Unsupported file type: ${file.type || "unknown"}. Upload a JPEG, PNG, WebP, or PDF.`,
    );
  }

  if (file.size > MAX_BYTES) {
    return jsonError(413, "file_too_large", "File must be under 8 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const { object } = await generateObject({
      model: google(MODEL),
      schema: extractedLoanDataSchema,
      system: EXTRACT_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Extract loan data from this document. Follow the rules in the system prompt strictly — leave fields as null if not present.",
            },
            {
              type: "file",
              data: buffer,
              mediaType: file.type,
            },
          ],
        },
      ],
      temperature: 0.1,
    });

    return new Response(JSON.stringify({ ok: true, data: object }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown extraction error";
    if (/RESOURCE_EXHAUSTED|quota|429/i.test(message)) {
      return jsonError(429, "quota_exceeded", message);
    }
    return jsonError(500, "extraction_failed", message);
  }
}

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ ok: false, error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
