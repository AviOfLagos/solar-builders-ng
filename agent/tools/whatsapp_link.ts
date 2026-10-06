import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Make a click-to-send WhatsApp link with the message already typed, for a person to open and send. Nothing is sent by this tool. Use it for customers, installers and suppliers since we have no WhatsApp sending yet.",
  inputSchema: z.object({ phone: z.string().max(30).describe("Nigerian number, 0803… or +234803…"), message: z.string().min(2).max(1500) }),
  async execute({ phone, message }) {
    const p = phone.replace(/\D/g, "").replace(/^0/, "234");
    if (p.length < 10) return { error: "That phone number looks too short." };
    return { link: `https://wa.me/${p}?text=${encodeURIComponent(message)}` };
  },
});
