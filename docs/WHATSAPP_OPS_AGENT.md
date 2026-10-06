# WhatsApp ops agent (issue #6)

The same assistant as `/admin/assistant`, on WhatsApp, for the team only. Customers never reach it; they go through the pipeline in `WHATSAPP_PIPELINE.md`.

## What exists
- `agent/channels/whatsapp.ts`: Chat SDK WhatsApp channel at `/eve/v1/whatsapp`. Messages from numbers not in `TEAM_WHATSAPP` are ignored silently.
- Approvals (orders, POs, emails, installer assignment) show as numbered options. Reply `1` to approve, `2` to cancel. Refunds, payouts and price changes are not available to the agent at all.
- `agent/schedules/daily-summary.ts`: 8am Lagos summary to every team number.
- Inert until the env below is set: without it every webhook fails signature checks and nothing is sent.

## Env (Vercel dashboard, you set these)
| Name | What |
|---|---|
| `WHATSAPP_ACCESS_TOKEN` | System user token (permanent) |
| `WHATSAPP_APP_SECRET` | Meta app secret |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID (not the number) |
| `WHATSAPP_VERIFY_TOKEN` | Any random string you choose |
| `TEAM_WHATSAPP` | Comma-separated team numbers, e.g. `2348012345678,2348098765432` |

## Meta setup
1. developers.facebook.com, create a Business app, add WhatsApp.
2. Add and verify the business number (it can't also be on the normal WhatsApp app).
3. Webhooks, WhatsApp, callback `https://solar.nexprove.com/eve/v1/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages`.
4. Business settings, System users, create one with `whatsapp_business_messaging` and `whatsapp_business_management`, generate a token.

## Limits
- WhatsApp only lets us send free text within 24h of the team member's last message. The 8am summary reaches you only if you messaged the bot in the last 24h; otherwise it needs a Meta-approved template (`daily_summary`). Message the bot once each evening, or add the template.
- Replies can't be edited, so answers arrive as one message.
