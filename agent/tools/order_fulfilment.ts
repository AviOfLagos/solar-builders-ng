import { defineTool } from "eve/tools";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "One order's purchase orders, installer job and profit margin; or with no order id, the late flags and the last 30 days' profit.",
  inputSchema: z.object({ orderId: z.string().max(40).optional() }),
  async execute({ orderId }, ctx) {
    return orderId ? act("order.fulfilment", who(ctx), { orderId }) : act("flags", who(ctx));
  },
});
