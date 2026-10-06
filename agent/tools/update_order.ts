import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "Move a paid order to confirmed, out_for_delivery, delivered or installed. The customer gets a notification, so only do this when it is true. Refunds are not possible here.",
  inputSchema: z.object({ orderId: z.string().max(40), status: z.enum(["pending", "confirmed", "out_for_delivery", "delivered", "installed"]) }),
  approval: always(),
  async execute(input, ctx) {
    return act("order.status", who(ctx), input);
  },
});
