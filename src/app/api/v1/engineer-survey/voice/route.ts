import { HttpError, fail, ok, route, limitIp, str } from "@/lib/server/api";
import { readUpload, storeUpload } from "@/lib/server/uploads";
import { transcribe, transcribeAll } from "@/lib/server/survey";

export const maxDuration = 60;

/**
 * A voice answer. Form fields: audio (the recording), key (a question key, or "all" for one note that answers
 * everything). Returns the text to drop into the form, and where the recording is kept.
 */
export const POST = route(async (req: Request) => {
  await limitIp(req, "engineer-voice", 40, 3600);
  const form = await req.formData().catch(() => null);
  if (!form) return fail("No recording came through. Try again.");
  const key = str(form.get("key"), 40);
  const { bytes, type } = await readUpload(form.get("audio"), "audio");
  const [path, result] = await Promise.all([
    storeUpload("installers/voice", bytes, type).catch((e) => { console.error("[voice store]", e); return ""; }),
    (key === "all" ? transcribeAll(bytes, type).then((answers) => ({ answers })) : transcribe(bytes, type, key).then((text) => ({ text }))).catch((e) => {
      console.error("[transcribe]", e);
      throw new HttpError(502, "We couldn't turn that recording into text. Try again, or type your answer.");
    }),
  ]);
  return ok({ ...result, voice: path });
});
