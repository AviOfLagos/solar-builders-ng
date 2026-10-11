import { fail, ok, route, limitIp } from "@/lib/server/api";
import { readUpload, storeUpload, uploadsReady } from "@/lib/server/uploads";

/** A photo of a past install. Stored privately; only the team can see it. */
export const POST = route(async (req: Request) => {
  if (!uploadsReady()) return fail("Photo uploads aren't switched on yet. Send your answers without photos.", 503);
  await limitIp(req, "engineer-photo", 20, 3600);
  const form = await req.formData().catch(() => null);
  if (!form) return fail("Choose a photo.");
  const { bytes, type } = await readUpload(form.get("photo"), "image");
  return ok({ path: await storeUpload("installers/photo", bytes, type) });
});
