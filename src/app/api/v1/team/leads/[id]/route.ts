import { db } from "@/lib/server/db";
import { fail, ok, route, requireTeam } from "@/lib/server/api";
import { updateLead } from "@/lib/server/agent-ops";
import { signedJson } from "@/lib/server/automation";

/**
 * Update a lead. Two callers:
 *  - the team panel (signed-in team member): empty body just marks the lead contacted.
 *  - the WhatsApp automation (n8n), signed with WEBHOOK_SECRET: { status, note, needs_human, stop }.
 */
export const PATCH = route(async (req: Request, ctx: RouteContext<"/api/v1/team/leads/[id]">) => {
  const id = (await ctx.params).id;
  if (req.headers.get("x-sb-signature")) {
    const b = await signedJson(req);
    return ok(await updateLead(id, b));
  }
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const sql = await db();
  const [l] = await sql`update leads set contacted_at = now() where id = ${id} returning id`;
  return l ? ok({ ok: true }) : fail("Lead not found.", 404);
});
