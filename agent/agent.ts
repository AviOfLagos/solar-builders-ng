import { defineAgent } from "eve";
import { google } from "@ai-sdk/google";

/**
 * The ops assistant behind /admin/assistant. Gemini, called directly with GOOGLE_GENERATIVE_AI_API_KEY
 * (set in Vercel → Settings → Environment Variables). Change the model with GEMINI_MODEL.
 * Read-only for now: it answers from our own data and never changes an order (see issue #7 and #6).
 */
export default defineAgent({
  model: google(process.env.GEMINI_MODEL || "gemini-2.5-flash"),
  defaultTools: false,
});
