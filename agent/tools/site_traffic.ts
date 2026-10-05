import { defineTool } from "eve/tools";
import { z } from "zod";
import { sql } from "../lib/db";

export default defineTool({
  description: "Website traffic for the last N days: visitors, top pages, most-clicked buttons and where visitors came from.",
  inputSchema: z.object({ days: z.number().int().min(1).max(180).default(7) }),
  async execute({ days }) {
    const db = sql();
    const since = db`at >= now() - make_interval(days => ${days})`;
    const [v] = await db`select count(distinct sid)::int as visitors, count(*) filter (where kind = 'view')::int as views from events where ${since} and sid <> ''`;
    const pages = await db`select path, count(*)::int as views from events where ${since} and kind = 'view' group by 1 order by 2 desc limit 10`;
    const clicks = await db`select name, count(*)::int as clicks from events where ${since} and kind = 'click' group by 1 order by 2 desc limit 10`;
    const sources = await db`select coalesce(nullif(ref, ''), 'Direct') as source, count(distinct sid)::int as visitors from events where ${since} and kind = 'view' group by 1 order by 2 desc limit 8`;
    return { days, ...v, topPages: pages, topClicks: clicks, sources };
  },
});
