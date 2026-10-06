import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "Set a lead's status (new, contacted, engaged, ready_to_buy, paid, lost) and/or add a short note about the conversation.",
  inputSchema: z.object({ leadId: z.string().max(40), status: z.enum(["new", "contacted", "engaged", "ready_to_buy", "paid", "lost"]).optional(), note: z.string().max(500).optional() }),
  approval: always(),
  async execute(input, ctx) {
    return act("lead.update", who(ctx), input);
  },
});
