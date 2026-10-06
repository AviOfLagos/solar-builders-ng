import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "Send an email from Solar Builders NG. kind 'customer': reply to someone on an order or lead (give their email; leads must have agreed to be contacted). kind 'outreach': write to a saved prospect (give prospectId); capped per day and always includes who we are and how to opt out. Write the message in full, plain and short, in the person's voice; never invent prices, stock or delivery dates, use tools to check. The person sees the full email and approves before it goes.",
  inputSchema: z.object({
    kind: z.enum(["customer", "outreach"]),
    to: z.string().max(120).optional().describe("customer email"),
    prospectId: z.string().max(40).optional(),
    subject: z.string().min(3).max(150), body: z.string().min(10).max(4000),
  }),
  approval: always(),
  async execute(input, ctx) {
    return act("email.send", who(ctx), input);
  },
});
