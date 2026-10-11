/**
 * Android app links: lets solar.nexprove.com/fund, /b and /s links open the Go Solar Me app without asking.
 * The fingerprint is public (it's in every copy of the app). Default: the EAS upload keystore (expo.dev → go-solar-me-app
 * → Credentials → Android). When the app is on Google Play, add Play's app-signing SHA-256 too, comma-separated,
 * in ANDROID_CERT_SHA256 (Play Console → App integrity).
 */
const EAS_UPLOAD_KEY = "F1:6B:39:17:B6:1E:89:94:D6:E0:EC:C5:D2:81:21:DE:08:66:5F:2B:1E:0D:EA:89:9E:B8:17:D2:3F:10:B5:C2";

export function GET() {
  const prints = (process.env.ANDROID_CERT_SHA256 || EAS_UPLOAD_KEY).split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  if (!prints.length) return new Response("Not set up yet", { status: 404 });
  return Response.json([{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: "ng.solarbuilders.gosolarme", sha256_cert_fingerprints: prints } }]);
}
