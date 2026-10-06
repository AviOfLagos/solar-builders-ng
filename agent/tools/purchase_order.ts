import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "Buy goods for a paid order. create: draft a purchase order from an order and a supplier (shipTo 'us' by default; 'customer' shares the customer's name, phone and address with the supplier, only when the person says so). send: email it to the supplier. update: set confirmed, delivered or cancelled, an expected date (YYYY-MM-DD), or the delivery cost. whatsapp: get the message and a WhatsApp link to send by hand.",
  inputSchema: z.object({
    do: z.enum(["create", "send", "update", "whatsapp"]),
    orderId: z.string().max(40).optional(), supplierId: z.string().max(40).optional(), poId: z.string().max(40).optional(),
    shipTo: z.enum(["us", "customer"]).optional(), status: z.enum(["confirmed", "delivered", "cancelled"]).optional(),
    expectedAt: z.string().max(10).optional(), deliveryCost: z.number().int().min(0).optional(), note: z.string().max(500).optional(),
  }),
  approval: ({ toolInput }) => (toolInput?.do === "whatsapp" ? "not-applicable" : "user-approval"),
  async execute({ do: what, ...rest }, ctx) {
    return act(`po.${what === "whatsapp" ? "message" : what}`, who(ctx), rest);
  },
});
