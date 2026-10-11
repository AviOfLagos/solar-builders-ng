/**
 * iOS universal links: lets solar.nexprove.com/fund, /b and /s links open the Go Solar Me app.
 * Needs APPLE_TEAM_ID (Apple Developer → Membership) in Vercel; until then it answers 404 and links open in the browser.
 */
const APP = "ng.solarbuilders.gosolarme";

export function GET() {
  const team = process.env.APPLE_TEAM_ID?.trim();
  if (!team) return new Response("Not set up yet", { status: 404 });
  return Response.json({
    applinks: { details: [{ appIDs: [`${team}.${APP}`], components: [{ "/": "/fund/*" }, { "/": "/b/*" }, { "/": "/s/*" }] }] },
    webcredentials: { apps: [`${team}.${APP}`] },
  });
}
