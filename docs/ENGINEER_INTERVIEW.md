# Installer interview

Live: https://solar.nexprove.com/engineers (share in installer groups). Results: Admin → Installer interviews.
Source of truth: `src/data/engineer-survey.ts`; this file mirrors it.

Six steps with progress at the top. Installers type or record voice notes (Gemini writes them down; pause, resume, done or discard from the recorder bar). Up to 3 photos of past installs. The AI marks each interview and sets Shortlisted / Not now / Needs a look; nothing is sent until the team presses Send.

## Profile (step 1)
- Name, WhatsApp, email (optional), area, years installing (Under 1 year, 1–3 years, 3–5 years, 5–10 years, 10+ years), installs a month (0–2, 3–5, 6–10, 11–20, 20+), team (Just me, 2–3 people, 4–6 people, 7+ people)

## Brands you trust
1. Which brands do you recommend for clients with a good budget?  
   _Inverters, batteries and panels_
2. And which brands for low-budget clients?
3. Which brands do you refuse to install, and why?

## How you price a job
4. What do you charge to install in a bungalow, and in a storey building?  
   _For a typical 3–5 kVA home system_
5. What do customers usually forget that you have to add? What does it cost?  
   _cables, breakers, surge protector, earthing, mounting, changeover…_

## Two quick checks
6. **Test:** A client wants to run a 1.5HP AC and a fridge on a 3 kVA inverter with a 2.5 kWh battery. What do you tell them?
7. **Test:** What cable size, breaker and earthing do you use between a 5 kVA inverter and its battery?

## Review our sample quote
8. Looking at the sample quote, what's the first thing you check or question?
9. What would you change, add or remove before you install it? Why?
10. What's missing that you need to price the job and install it properly?  
   _Details about the house, cable runs, accessories, anything you'd normally have to ask the client_

## Working with us
11. What would make you take jobs from us, and how fast can you finish a typical setup?
12. Would you use an app to make quotes for your own clients? What's the one thing it must do?

## Sample quote v1 (frozen)
Page: https://solar.nexprove.com/engineers/sample-quote. Never edit a published version; add v2 with new question keys to test a new format.

## Follow-up (shortlisted installers only)
- What would you need to add to a quote that isn't a standard product?
- Would you want to load a quote from someone else into the app and edit it? What do you change most?
- How should a quote reach your client: WhatsApp link, PDF, with your own name and logo?
- What usually goes wrong after an install, and what would prevent it?
- If we send you a job on WhatsApp, what must it include for you to accept without calling the customer?

## Marking guide (check against your best installers)
### test_sizing
Good:
- Notes a 1.5HP AC draws roughly 1.1–1.4 kW running and needs 3–5× that to start unless it is an inverter AC
- Counts the fridge's start-up surge too
- Says a 3 kVA inverter can start a 1.5HP inverter AC but may trip on a non-inverter one
- Works out that a 2.5 kWh battery (about 2 kWh usable) runs the AC only 1.5–2 hours
- Recommends an inverter AC, a bigger battery (5 kWh or more) and/or a 5 kVA inverter, or running the AC on daytime solar only
Weak:
- Says it will run fine all night
- Ignores start-up surge
- Ignores battery capacity

### test_wiring
Good:
- Starts from the system voltage: about 100–130 A at 48 V, over 200 A at 24 V
- Picks copper battery cable sized to that current and the run length (e.g. 25–35 mm² for a short 48 V run)
- Uses a DC-rated breaker or fuse just above the maximum current (about 125–150 A at 48 V)
- Keeps battery runs short with proper lugs and crimping
- Bonds inverter chassis and panel frames to an earth rod, and adds surge protection
Weak:
- Uses an AC breaker on the DC side
- Thin cable such as 6–10 mm²
- No earthing
- No mention of voltage or current

## Messages
- Shortlisted: Hi {first}, thank you for your interview with Solar Builders NG. You've been shortlisted for our installer network. We'll message you on WhatsApp to set up a short call and a few follow-up questions.
- Not now: Hi {first}, thank you for taking the time to answer our installer interview. We're at capacity in your area right now, so we can't take you on yet. We've kept your details and will reach out when more jobs open up.
