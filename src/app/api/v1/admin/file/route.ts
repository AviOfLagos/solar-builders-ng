import { fail, route, requireTeam, str } from "@/lib/server/api";
import { readStored } from "@/lib/server/uploads";

/** GET ?p=installers/... -> a private upload (photo or voice note), for signed-in team members only. */
export const GET = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  const r = await readStored(str(new URL(req.url).searchParams.get("p"), 300));
  if (!r) return fail("File not found.", 404);
  return new Response(r.stream, { headers: { "content-type": r.blob.contentType, "cache-control": "private, max-age=3600" } });
});
