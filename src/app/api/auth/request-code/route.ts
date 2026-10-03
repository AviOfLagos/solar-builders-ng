import { NextResponse } from "next/server";
import { issueOtp } from "@/lib/server/session";
import { sendMail, shell, brevoConfigured } from "@/lib/server/brevo";
import { isEmail } from "@/lib/format";

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({}));
  const e = String(email || "").trim().toLowerCase();
  if (!isEmail(e)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const code = await issueOtp(e);
  await sendMail({
    to: [{ email: e }],
    subject: `${code} is your Solar Builders sign-in code`,
    html: shell("Your sign-in code", `<p style="font-size:15px">Enter this code to see your saved cards and orders. It expires in 10 minutes.</p><p style="font-size:32px;letter-spacing:6px;font-weight:bold;margin:16px 0">${code}</p><p style="font-size:12px;color:#5B6B80">If you didn't ask for this, ignore this email.</p>`),
    text: `Your Solar Builders sign-in code is ${code}. It expires in 10 minutes.`,
  });
  // Without Brevo configured (local/dev/demo), surface the code so the flow is testable.
  const demo = !brevoConfigured() && (process.env.NODE_ENV !== "production" || process.env.DEMO_SHOW_CODES === "1");
  return NextResponse.json({ ok: true, ...(demo ? { devCode: code } : {}) });
}
