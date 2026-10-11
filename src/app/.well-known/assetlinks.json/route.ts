/**
 * Android app links: lets solar.nexprove.com/fund, /b and /s links open the Go Solar Me app without asking.
 * Needs ANDROID_CERT_SHA256 in Vercel: the app's signing certificate SHA-256 (EAS: `eas credentials`, Android,
 * or Play Console → App integrity). Several can be comma-separated. Until then it answers 404.
 */
export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 ?? "").split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  if (!prints.length) return new Response("Not set up yet", { status: 404 });
  return Response.json([{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: "ng.solarbuilders.gosolarme", sha256_cert_fingerprints: prints } }]);
}
