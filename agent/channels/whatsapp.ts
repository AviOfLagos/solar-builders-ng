import { createPostgresState } from "@chat-adapter/state-pg";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import type { Message, Thread } from "chat";
import { chatSdkChannel } from "eve/channels/chat-sdk";

/**
 * Ops agent on WhatsApp (issue #6). Team numbers only; customers are handled by the n8n pipeline (#2).
 * Inert until WHATSAPP_* env vars are set: without them the adapter gets random placeholders, so every
 * webhook fails signature verification and nothing is ever sent.
 */
const rnd = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const env = process.env;

/** Digits only, so "+234 801 234 5678" and "2348012345678" match. */
const digits = (s: string) => s.replace(/\D/g, "");
export const teamNumbers = (): string[] => (env.TEAM_WHATSAPP || "").split(",").map(digits).filter(Boolean);
export const isTeamNumber = (n: string) => teamNumbers().includes(digits(n));

export const { bot, channel, send } = chatSdkChannel({
  userName: "Solar Builders Ops",
  adapters: {
    whatsapp: createWhatsAppAdapter({
      accessToken: env.WHATSAPP_ACCESS_TOKEN || env.WHATSAPP_TOKEN || rnd(),
      appSecret: env.WHATSAPP_APP_SECRET || rnd(),
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "0",
      verifyToken: env.WHATSAPP_VERIFY_TOKEN || rnd(),
      userName: "Solar Builders Ops",
    }),
  },
  state: env.POSTGRES_URL || env.DATABASE_URL ? createPostgresState() : createMemoryState(),
  streaming: false,
  resolveInputAuth: (event) => ({
    authenticator: "whatsapp-team",
    principalType: "user",
    principalId: `whatsapp:${event.user?.userId ?? "unknown"}`,
    attributes: {},
  }),
});

async function handle(thread: Thread, message: Message) {
  const from = message.author?.userId || "";
  if (!isTeamNumber(from)) return; // not the team: stay silent, customers belong to the pipeline
  await send(message.text, {
    thread,
    auth: { authenticator: "whatsapp-team", principalType: "user", principalId: `whatsapp:${digits(from)}`, attributes: {} },
  });
}

bot.onNewMention(async (thread, message) => {
  if (!isTeamNumber(message.author?.userId || "")) return;
  await thread.subscribe();
  await handle(thread, message);
});
bot.onSubscribedMessage(handle);

export default channel;
