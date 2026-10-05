import { eveChannel } from "eve/channels/eve";
import { type AuthFn, ForbiddenError, localDev } from "eve/channels/auth";

const SITE = process.env.SITE_URL || "https://solar.nexprove.com";

/**
 * Only signed-in team members reach the assistant. The browser sends the site's session cookie
 * (same origin); we ask the site who it belongs to and whether they're on TEAM_EMAILS.
 */
function teamSession(): AuthFn<Request> {
  return async (request) => {
    const cookie = request.headers.get("cookie");
    if (!cookie) return null;
    const res = await fetch(`${SITE}/api/v1/me`, { headers: { cookie }, signal: AbortSignal.timeout(5000) }).catch(() => null);
    if (!res?.ok) return null;
    const me = (await res.json().catch(() => null)) as { user?: { email: string; name: string } | null; team?: boolean } | null;
    if (!me?.user) return null;
    if (!me.team) throw new ForbiddenError({ code: "not_team", message: "Only the Solar Builders team can use the assistant." });
    return { authenticator: "solar-builders", principalId: me.user.email, principalType: "user", attributes: { name: me.user.name } };
  };
}

export default eveChannel({ auth: [teamSession(), localDev()] });
