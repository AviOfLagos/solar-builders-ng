import { body, ok, route, requireTeam } from "@/lib/server/api";
import { listInstallers, saveInstaller } from "@/lib/server/fulfilment";

export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok({ installers: await listInstallers() });
});

export const POST = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  await saveInstaller(await body(req));
  return ok({ installers: await listInstallers() });
});
