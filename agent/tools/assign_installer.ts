import { defineTool } from "eve/tools";
import { z } from "zod";
import { act, who } from "../lib/act";
import { sql } from "../lib/db";

export default defineTool({
  description: "Assign an installer to an order, with an optional job date (YYYY-MM-DD) and fee in naira (defaults to their usual fee). Pass no installerId to list active installers and suppliers first.",
  inputSchema: z.object({ orderId: z.string().max(40).optional(), installerId: z.string().max(40).optional(), jobDate: z.string().max(10).optional(), fee: z.number().int().min(0).optional() }),
  approval: ({ toolInput }) => (toolInput?.installerId ? "user-approval" : "not-applicable"),
  async execute(input, ctx) {
    if (!input.installerId) {
      const [installers, suppliers] = await Promise.all([
        sql()`select id, name, phone, areas, rate from installers where active order by name`,
        sql()`select id, name, brands from suppliers where active order by name`,
      ]);
      return { installers, suppliers };
    }
    return act("job.assign", who(ctx), input);
  },
});
