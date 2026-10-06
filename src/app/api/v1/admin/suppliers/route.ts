import { body, ok, route, requireTeam } from "@/lib/server/api";
import { listSuppliers, saveSupplier } from "@/lib/server/fulfilment";

export const GET = route(async () => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  return ok({ suppliers: await listSuppliers() });
});

export const POST = route(async (req: Request) => {
  const s = await requireTeam();
  if (s instanceof Response) return s;
  await saveSupplier(await body(req));
  return ok({ suppliers: await listSuppliers() });
});
