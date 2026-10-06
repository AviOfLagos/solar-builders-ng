import { defineAgent } from "eve";
import { google } from "@ai-sdk/google";

/**
 * The ops assistant behind /admin/assistant. Gemini, called directly when GOOGLE_GENERATIVE_AI_API_KEY is set
 * (Vercel → Settings → Environment Variables). Without it, the same model runs through Vercel AI Gateway, which
 * signs in with the project itself on Vercel, so no key is needed. Change the model with GEMINI_MODEL.
 * Read-only for now: it answers from our own data and never changes an order (see issue #7 and #6).
 */
const name = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export default defineAgent({
  model: process.env.GOOGLE_GENERATIVE_AI_API_KEY ? google(name) : `google/${name}`,
  defaultTools: false,
});
