import { defineSchedule } from "eve/schedules";
import whatsapp, { teamNumbers } from "../channels/whatsapp";

/** 8am Lagos (07:00 UTC): the day's next actions to every team number. Skipped until WhatsApp is configured. */
export default defineSchedule({
  cron: "0 7 * * *",
  async run({ to, waitUntil, appAuth }) {
    const phone = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!phone || !process.env.WHATSAPP_APP_SECRET) return;
    for (const n of teamNumbers()) {
      waitUntil(
        to(whatsapp, { adapterName: "whatsapp", threadId: `whatsapp:${phone}:${n}` }).send(
          "Morning summary: use next_actions and flags, then send the team a short list: what needs me today, orders at risk, leads waiting. Under 8 lines.",
          { auth: appAuth },
        ),
      );
    }
  },
});
