import "server-only";
import { put, get } from "@vercel/blob";
import { HttpError } from "./api";

/**
 * Private file storage (Vercel Blob, store "solar-ng-uploads"). Files are never public: the team views them
 * through /api/v1/admin/file, which checks they're signed in.
 */
export const uploadsReady = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const MAX = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "audio/webm": "webm", "audio/ogg": "ogg", "audio/mp4": "m4a", "audio/mpeg": "mp3", "audio/aac": "aac", "audio/wav": "wav", "audio/x-m4a": "m4a" };

/** Checks an uploaded file and returns its bytes and clean media type. */
export async function readUpload(f: FormDataEntryValue | null, kind: "image" | "audio") {
  if (!f || typeof f === "string") throw new HttpError(400, kind === "image" ? "Choose a photo." : "No recording came through. Try again.");
  const type = f.type.split(";")[0].trim().toLowerCase();
  if (!type.startsWith(kind + "/") || !EXT[type]) throw new HttpError(400, kind === "image" ? "Use a JPG, PNG or WebP photo." : "That recording format isn't supported. Try another browser.");
  if (f.size > MAX) throw new HttpError(413, kind === "image" ? "That photo is too large. Use one under 4 MB." : "That recording is too long. Keep it under about 4 minutes.");
  if (f.size < 200) throw new HttpError(400, kind === "image" ? "That photo is empty." : "That recording is empty. Hold the button a little longer.");
  return { bytes: new Uint8Array(await f.arrayBuffer()), type };
}

/** Stores a file privately and returns its path, which is what we keep in the database. */
export async function storeUpload(folder: string, bytes: Uint8Array, type: string) {
  if (!uploadsReady()) return "";
  const r = await put(`${folder}/${Date.now()}.${EXT[type]}`, Buffer.from(bytes), { access: "private", contentType: type, addRandomSuffix: true });
  return r.pathname;
}

export async function readStored(path: string) {
  if (!uploadsReady() || !/^installers\/(photo|voice)\/[\w.-]+$/.test(path)) return null;
  const r = await get(path, { access: "private" });
  if (!r || r.statusCode !== 200) return null;
  return r;
}

/** The bytes of a stored file, for sending photos to the AI. */
export async function storedBytes(path: string) {
  const r = await readStored(path);
  if (!r) return null;
  return { bytes: new Uint8Array(await new Response(r.stream).arrayBuffer()), type: r.blob.contentType };
}
