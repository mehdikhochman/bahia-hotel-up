import { createOpenAI, openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

/**
 * Resolves the chat model based on whatever credentials are configured:
 *
 *   • OPENROUTER_API_KEY → proxy via openrouter.ai (preferred when set —
 *     unified API, fallbacks, and 100+ models accessible by string).
 *   • OPENAI_API_KEY     → direct OpenAI call.
 *   • Otherwise          → throws when the chat route runs.
 *
 * Model is overridable via OPENROUTER_MODEL / OPENAI_MODEL env vars.
 */
export function getChatModel(): LanguageModel {
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      // OpenRouter strongly recommends sending these headers for analytics
      // and free-tier quota tracking.
      headers: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_SITE_URL ??
          "https://bahia-hotel-up.vercel.app",
        "X-Title": "Bahia Hotel - Iya Concierge",
      },
    });
    const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
    return openrouter(model);
  }

  if (process.env.OPENAI_API_KEY) {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    return openai(model);
  }

  throw new Error(
    "No AI provider configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY."
  );
}

/** True when Whisper transcription is available (OpenAI key required). */
export function isVoiceEnabled() {
  return Boolean(process.env.OPENAI_API_KEY);
}
