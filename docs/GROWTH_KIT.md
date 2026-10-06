# Growth kit: what to plug in next

The assistant (`/admin/assistant`) can already read the business, act with your approval (orders, leads,
purchase orders, installers, customer emails, distributor outreach) and say what to do next.
This kit lists what to add after that, cheapest first. Nothing here needs a paid plan to start.
Platform rules and prices change: check each "Verify" line before building.

## 0. What is already in place (free)

| Need | How it works today |
| --- | --- |
| Reply to customers | `send_email` (needs `RESEND_API_KEY`, free tier is enough). Customers reply into `ORDER_ALERT_EMAIL`. |
| WhatsApp | `whatsapp_link`: a message typed out, a person taps send. No API, no cost. |
| Distributor outreach | `prospects` list + `send_email kind=outreach`. 15 a day cap, opt-out line, logged in `outbound_log`. |
| What to do next | `next_actions`: cold leads, orders with no PO, quiet suppliers, follow-ups due. |
| Metrics | Own events table, UTM sources, weekly table, Monday digest. |

**Do first (30 minutes, free):** set `RESEND_API_KEY` (Vercel Marketplace), `ORDER_ALERT_EMAIL`, `MAIL_FROM` on a
domain you own (so mail doesn't land in spam), and add 10 real prospects. Then ask the assistant "what should we do today?".

## 1. Inbound email, so the assistant can read replies (free)

Today replies go to your inbox and the assistant can't see them.
- Resend inbound (or a forwarding address) posts each reply to a webhook `/api/v1/inbound/email`.
- Store in `outbound_log` (direction column), match by sender to a lead, order or prospect.
- Assistant then drafts the answer; you approve. A "stop" reply sets `prospects.stop`.
- Effort: about half a day. Cost: free tier.
- Verify: Resend inbound availability on your plan.

## 2. Social DMs and metrics (one tool at a time)

Goal: message people and read numbers from Instagram, LinkedIn, X, Facebook, TikTok from the assistant.

**Reality check, so you don't lose a week:**
- Instagram and Facebook DMs: the official route is the Meta Graph / Messenger API. It needs a Facebook Page linked to an
  Instagram Business account, a Meta developer app, and review for some permissions. It lets you reply to people who
  messaged you (usually within 24 hours). It does not let you cold-DM strangers. That is Meta's rule, not ours.
- LinkedIn: no public API for sending DMs to people you don't know. Sending connection notes through scrapers or
  automation tools breaks their terms and gets accounts banned. Do LinkedIn by hand, with the assistant writing the message
  (a `prospects` field already holds the profile link).
- X: reading and posting are possible; the free tier is very limited and prices change. Verify before planning on it.
- TikTok: posting and basic stats through its developer program; DMs aren't offered.

**What does work and is cheap:**
1. **Buffer** (already connected in this workspace): schedule posts to Instagram, LinkedIn, X, Facebook and pull post
   metrics from one place. Free plan covers a few channels. Add a `social_metrics` assistant tool that calls Buffer's API
   for "how did last week's posts do". Effort: 1 day. Verify: free-plan API access.
2. **Meta Graph API (Instagram Insights, Page Insights)**: free to call. Gives followers, reach, post stats, and inbox
   replies. Add a `meta_inbox` tool: list new messages, draft a reply, send on approval. Effort: 2 to 3 days plus Meta app setup.
3. **Unified inbox**: if one tool for every channel is wanted, a "social SDK" such as Chat SDK adapters (Slack,
   WhatsApp, Telegram, etc.) already in this repo's plan (issue #6) covers WhatsApp; Instagram/Facebook go through Meta as above.

Order: Buffer metrics, then Meta inbox, then WhatsApp Cloud API (issues #2 and #6).

## 3. WhatsApp Cloud API (issues #2 and #6)

- Replaces `whatsapp_link` with real sending and receiving. Meta bills per conversation; a business-initiated message
  needs an approved template; replies inside 24 hours are free-form. Small volumes cost little, but it is not zero. Verify current pricing.
- Needs: Meta Business account, a phone number, `WHATSAPP_*` env vars (already read by `notifyOwner`).
- Then the assistant can message customers, installers and suppliers directly (still behind approval).

## 4. SEO (free tools first)

- **Google Search Console API** (free): clicks, impressions, queries, pages. Tool `seo_report`: top queries, pages with
  impressions but low clicks, pages not indexed. Needs a service account added to the Search Console property.
- **On-site basics the assistant can audit**: titles, descriptions, headings, product schema, sitemap, internal links,
  image alt text, page speed (PageSpeed Insights API is free).
- **Content**: assistant drafts product and guide pages ("what size inverter for a 3-bedroom flat in Lagos") from the
  catalog. Publishing goes through a PR or an admin page so a person reviews it.
- Effort: 2 days for Search Console and the audit tool. Cost: none.

## 5. Meta ads

- Marketing API is free to call; you pay Meta for ad spend only.
- Safe first step: read-only. A tool that pulls spend, reach, cost per lead by campaign into the dashboard.
- Second step: the assistant drafts campaigns and creatives; you approve; it creates them **paused**.
- Never let it spend without a per-campaign budget cap set in Meta and a person pressing publish.
- Needs: Meta Business account, ad account, app review for ads permissions. Effort: 3 to 5 days. Verify: current permission review steps.
- Use the UTM capture already shipped (`utm_source=meta&utm_campaign=...`) so the weekly table shows what ads bring in.

## 6. Guardrails (apply to everything above)

- Every send, publish or spend sits behind approval. Reading never does.
- Keep a log of every outbound message (`outbound_log`); add one for ads and posts.
- Email only people who asked, or businesses you are introducing yourselves to, with a clear way to opt out. Honour "stop" at once.
- Don't buy followers, scrape contact lists, or automate personal accounts. It gets accounts banned and hurts the brand.
- Money moves (refunds, payouts, ad spend) stay with a person.

## Suggested order

1. Email on, 10 prospects in, daily "what to do" (today).
2. Inbound email (section 1).
3. Buffer metrics + scheduling (section 2.1).
4. Search Console report (section 4).
5. WhatsApp Cloud API (section 3).
6. Meta inbox, then read-only ads, then drafted ads (sections 2.2 and 5).
