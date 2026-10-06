import { defineTool } from "eve/tools";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "The outreach pipeline: distributors, installers, brands and resellers we want to work with. list: filter by status (new, contacted, replied, won, lost) or only those due for follow-up. save: add one, or update one by id (status, notes, follow-up date YYYY-MM-DD, contact details). Only save contact details that were given or found on the business's own public pages; never guess an email.",
  inputSchema: z.object({
    do: z.enum(["list", "save"]), status: z.enum(["new", "contacted", "replied", "won", "lost"]).optional(), due: z.boolean().optional(),
    id: z.string().max(40).optional(), name: z.string().max(100).optional(), kind: z.enum(["distributor", "installer", "brand", "reseller", "other"]).optional(),
    email: z.string().max(120).optional(), phone: z.string().max(30).optional(), instagram: z.string().max(80).optional(), linkedin: z.string().max(200).optional(), website: z.string().max(200).optional(),
    notes: z.string().max(1000).optional(), followUpOn: z.string().max(10).optional(),
  }),
  approval: ({ toolInput }) => (toolInput?.do === "save" ? "user-approval" : "not-applicable"),
  async execute({ do: what, ...rest }, ctx) {
    return what === "list" ? act("prospects.list", who(ctx), rest) : act("prospect.save", who(ctx), rest);
  },
});
