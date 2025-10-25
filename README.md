# catchthebus-sofia

> A (soon-to-be) slick web app that tells you when to leave so you actually catch the bus in Sofia instead of doing that Olympic power sprint to the stop.

## What this repo is
- Frontend app scaffold (React/Next/etc. coming together).
- Our playground for building real-time "when should I leave" predictions.
- The lab where we teach JavaScript to care about Bulgarian public transit.

Right now the codebase is in early boot-up mode. We just cleaned up `node_modules` from version control (may it rest in peace 🙏) and added a proper `.gitignore`, so the repo is finally not 98% vendor trash.

## High-level goal
You open the app, type where you are and which bus/tram/etc. you want to catch. The app tells you: *"leave in 3 minutes"* or *"leave NOW RUN RUN RUN"*.

No mental math. No guessing if the 204 is fashionably late or cosmically early today.

## Roadmap (MVP-ish)
1. Basic frontend with a simple UI:
   - Origin / destination input
   - Selected line / route
   - "When do I have to leave?" output

2. Data layer hookup:
   - Consume Sofia GTFS / live arrival data (or whatever API we can get).
   - Simple calculation: current time + walking time → must-leave-by timestamp.

3. Polish:
   - Clean styling (minimal, mobile first).
   - Friendly wording and panic states that feel helpful, not judgy.

## Dev setup (early draft)
Until we finalize the framework setup, the safest assumptions are:

- You will need Node.js >= 18.
- Run `npm install` in the root (after we push the real `package.json`).
- Run `npm run dev` to launch the local app.

If `npm run dev` screams at you, that's expected at this stage. Screaming is part of the process.

## Repo hygiene
- `node_modules/` is ignored ✅
- We'll keep secrets out of the repo (API keys, etc.) ✅
- We'll use feature branches + PRs instead of cowboy-committing directly to `main` 🤠❌

## Next up
- [ ] Add the initial React/Next.js (or Vite+React) app skeleton.
- [ ] Add a super barebones page where you enter your stop and it returns a fake "leave by 14:37" answer.
- [ ] Hook up real data after we prove the flow.

## Questions for Future Us™
- Are we doing web only first, or also mobile wrapper (Expo/etc.)?
- Do we want multilingual (BG/EN) from day 1?
- What's the data source for live bus ETAs in Sofia, and can we legally/ethically/technically talk to it without angering anyone important?

---

### tl;dr for new contributors
You're very early. The app is not fully scaffolded yet. But the mission is clear: **
Help humans in Sofia stop missing buses.**

Clone the repo. Stay tuned. Commit responsibly. Hydrate.
