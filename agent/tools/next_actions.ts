import { defineTool } from "eve/tools";
import { z } from "zod";
import { act, who } from "../lib/act";

export default defineTool({
  description: "What the business should do next, ranked: leads going cold, paid orders with no purchase order, quiet suppliers, missing installers, follow-ups due, commission to pay. Call this when asked what to do, how to make more sales, or at the start of a day.",
  inputSchema: z.object({}),
  async execute(_i, ctx) {
    return act("brief", who(ctx));
  },
});
