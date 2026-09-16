# Mikasa Bot — Improvement Ideas & Performance Upgrades

*Generated from scanning the full codebase, AGENT-REPORT.md, and AUDIT-REPORT.md*

---

## 1. CRITICAL FIXES (Must Do First)

### 1.1 Fix Ticket Type Routing (P0-1)
**Problem:** Ticket panel sends hash values that don't match ticket-config.json types — so "buy" and "apply" tickets never trigger their flows.

**Fix:**
- In `Commands/ticket/ticketPanel.js`, use the actual values from `ticket-config.json` (`support`, `buy`, `apply`) instead of hash strings
- Or map the hashes in `index.js:639`

**Impact:** Unblocks the entire project/apply flow — currently broken.

---

### 1.2 Fix JSON State Corruption on Shutdown (P1-1)
**Problem:** Fire-and-forget async writes (`db.js:72`, `questionFlow.js:92`, `giveaway.js:45`, etc.) can truncate JSON files when the bot restarts or is killed. This was proven during audit testing.

**Fix:**
- Implement a single queued writer for all JSON state files (promise chain)
- Change SIGINT/SIGTERM handlers in `index.js:1267-1279` to await a drain before `process.exit(0)`
- Debounce writes — batch multiple changes into one disk write

**Impact:** Prevents data loss on every restart.

---

### 1.3 Close Verification Auth Bypass (P1-2)
**Problem:** `server.js:321-377` — `GET /verify` and `POST /verify` have no authentication. Anyone with a guild/user ID in the query string can grant any user the verify role.

**Fix:**
- Require `req.isAuthenticated()` on both endpoints
- Validate the user owns the Discord account they're verifying

---

### 1.4 Add Staff Permission Checks (P1-3)
**Problem:** `applySystem.js:254-289` and `projectTicket.js:206-243` — approve/decline buttons have no staff check. Any channel viewer can grant the Developer role or accept/decline projects.

**Fix:**
- Add `isStaffMember` check to `handleDevAppApprove`, `handleDevAppDecline`, `handleProjectAccept`, `handleProjectDecline`

---

### 1.5 Fix Hardcoded localhost URL (P1-4)
**Problem:** `index.js:306` — sends `http://localhost:3000/verify?...` to real users. Unreachable outside the host machine.

**Fix:**
- Use `process.env.DOMAIN` (already used by `server.js:129`)

---

## 2. PERFORMANCE UPGRADES

### 2.1 Debounce + Serialize All JSON File Writes
**Current:** 1000 concurrent ops can trigger 1000 full-file writes (e.g. giveaway joins). Race conditions + disk thrash.

**Fix:**
- Single promise-chain writer for: `guildSettings.json`, `saved-sessions.json`, `giveaways.json`, `scanHistory.json`, `project-ai-reviews.json`, `projects.json`, `userStats.json`, `marketplace.json`
- Debounce: flush every 500ms or on `setImmediate`, whichever comes first
- Expected improvement: ~10x fewer disk writes under load

---

### 2.2 Cache pro.db Reads in Memory (P1-7)
**Current:** `protectionEvents.js:65-70` does 4 synchronous full-file reads per message. Same pattern in every `Events/*.js` file.

**Fix:**
- Load `database.json` into memory at startup
- Read from cache in hot paths
- Flush to disk on debounced interval (see 2.1)
- Expected improvement: message event latency drops significantly in servers with high message volume

---

### 2.3 Use interaction.deferReply() for Slow Operations
**Current:** Only `transcript_btn` defers (`index.js:1024`). AI scans, portfolio scans, transcripts all hit the 3-second interaction timeout risk.

**Fix:**
- Call `interaction.deferReply()` at the start of any handler that does AI work, file I/O, or API calls
- Edit the reply when done
- Affects: `projectEvaluator.js` calls, `portfolioScanner` calls, transcript generation, `giveaway` operations

---

### 2.4 Fix Giveaway Ended-Check Infinite Loop (P2-7)
**Current:** `giveaway.js:129-164` — if `messages.fetch` fails (message deleted), the giveaway is never removed and `endTime <= now` stays true → retries every 10s forever.

**Fix:**
- Remove the giveaway from the array on fetch error
- Add a max-retry count

---

### 2.5 Replace setTimeout-per-key Cooldown with Single Sweep (P2-6 in perf section)
**Current:** `utils.js:251-258` — `setCooldown` spawns one `setTimeout` per cooldown key. Thousands of users = thousands of timers.

**Fix:**
- Single `setInterval` that sweeps the cooldown map every second
- Store expiry timestamps, not timer objects
- Expected improvement: lower memory, fewer timers, cleaner shutdown

---

### 2.6 Cache Last Control Message ID (P2-11 in audit)
**Current:** `index.js:795, 921, 1093` — `channel.messages.fetch({limit: 10})` on every button click. Expensive and unnecessary.

**Fix:**
- Store the last control message ID in the idleSystem tracker or a dedicated map
- Fetch only when the cached ID is stale

---

### 2.7 Index Open Tickets by User ID (P2-12 in audit)
**Current:** `index.js:642-646` scans every channel's permission overwrites per ticket open.

**Fix:**
- Maintain a `Map<userId, channelId[]>` of open tickets
- Update on open/close
- Lookup becomes O(1) instead of O(channels)

---

## 3. FEATURE IMPROVEMENTS

### 3.1 Real Marketplace Storefront (Web)
**Current:** `Commands/store/store.js` only shows a text description from guild settings. The marketplace data exists in `marketplace.json` but has no UI.

**Add:**
- `/marketplace` web page — grid of product cards by category
- Search bar
- Product detail page: description, seller info, AI originality badge, price, payment method
- "Purchase" button that initiates payment flow
- Seller dashboard: view own products, earnings, stats

---

### 3.2 Payment Processing (Stripe)
**Current:** Payment methods are descriptive only — no actual money movement.

**Add:**
- Stripe integration for USD payments
- Payment Intents for 50% upfront (create → confirm → capture after delivery)
- Per-task: separate Payment Intent per milestone
- After-completion (trusted only): defer all charges until delivery confirmation
- Webhook handler for payment confirmation
- Note: Roblox/robux payments are not directly integrable via API — Stripe is the most viable option

---

### 3.3 Project Lifecycle State Machine
**Current:** Ad-hoc state handling. No formal states.

**Add:**
```
Seller products:
  SUBMITTED → AI_ANALYSIS → ADMIN_REVIEW (pending/accepted/declined)
    ↓ (accepted)
  LISTED → SOLD / REMOVED

Buyer requests:
  SUBMITTED → AI_ANALYSIS → ADMIN_REVIEW (pending/accepted/declined)
    ↓ (accepted)
  IN_PROGRESS → (milestones) → DELIVERED → PAYMENT_PENDING → COMPLETED
    ↓ (declined)
  CLOSED
```

**Benefit:** Clear state transitions, easier to debug, enables features like milestone tracking, delivery confirmation, payment release.

---

### 3.4 Originality Enforcement Gate
**Current:** AI originality check is advisory only. No hard block on clones. No ownership proof required.

**Add:**
- Hard gate before listing: AI originality must return `original` or `needs_proof`
- If `needs_proof`: require seller to provide source files, reference links, proof of ownership
- Admin review must confirm originality before product goes live
- Optional: cross-check new submissions against existing marketplace products for similarity

---

### 3.5 Post-Acceptance Workflows
**Current:** After admin accepts a seller or buyer, nothing happens automatically.

**Add:**
- **Seller accepted →** DM seller a link to upload final assets / set final price / manage listing
- **Buyer accepted →** DM buyer a link to payment, create project in projectStore for developers to apply to
- **Developer accepted →** Add to ticket channel, create milestone tracker, set up delivery mechanism

---

### 3.6 User Profiles & Reputation
**Current:** Discord OAuth exists but only for verification. No user profiles, purchase history, seller stats, or reputation.

**Add:**
- User profile page (web): Discord tag, join date, trusted status, purchase history, seller portfolio, earnings
- Seller ratings visible to buyers (aggregated from completed transactions)
- Trusted status badge visible in Discord (role or embed)

---

### 3.7 Developer-Project Matching
**Current:** Buyer requests don't create project listings that developers can apply to. The old `projectStore` system has `apply_project_` buttons but the current buyer flow doesn't create projects there.

**Add:**
- After buyer request is accepted, create a project entry in `projectStore`
- Notify developers (role ping or channel post)
- Developers apply via the existing `apply_project_` flow
- Client reviews developer applications and accepts one

---

### 3.8 Delivery & Payment Release Cycle
**Current:** No project workspace, no milestone tracking, no delivery mechanism, no payment release.

**Add:**
- Milestone tracking (for per-task payments): create milestones, mark complete, trigger payment
- Delivery mechanism: developer uploads final work, client confirms receipt
- Payment release: auto-release per Stripe webhook or manual confirm
- Dispute flow: if client doesn't confirm, escalate to admin

---

### 3.9 Support AI Improvements
**Current:** Support AI is a bot account, not a "normal" user account. Uses `getAIResponse()` from `aiHandler.js` but `projectEvaluator.js` uses a separate Groq-only path — inconsistent.

**Add:**
- Give the bot a human-sounding name and avatar (bot accounts still show "Bot" tag but feel more natural)
- Unify AI calling: use the same multi-provider fallback (`aiHandler.js`) for evaluations too, not just Groq
- Add conversation memory: remember context across messages in a session (already partially done via `aiHandler.js` session system)
- Add analytics: track what questions users ask, escalation rate, resolution rate — use to improve the system prompt

---

### 3.10 Notifications Beyond Discord
**Current:** All notifications are Discord-only. 24h escalation is a Discord message only.

**Add (optional):**
- Email notifications for: payment receipt, project delivery, admin response, account verification
- Use a simple SMTP library (nodemailer) or a service like SendGrid
- Low priority — Discord is the primary channel

---

## 4. CODE QUALITY & MAINTAINABILITY

### 4.1 Split Monolithic index.js
**Current:** 1411 lines with all interaction handling in one file. Hard to maintain, test, or extend.

**Fix:**
- Split into modules:
  - `handlers/ticket.js` — ticket creation, close, reopen, claim
  - `handlers/marketplace.js` — marketplace buttons, seller/buyer flows
  - `handlers/apply.js` — developer/staff application flows
  - `handlers/general.js` — verification, rating, giveaway, etc.
- Keep `index.js` as the router only

---

### 4.2 Consolidate Duplicate Application Systems (P2-2)
**Current:** Legacy `applyTicket.js` (message-based) + new `applySystem.js` (modal-based) coexist. `applyTicket.startApplySelection` is exported but never wired in — dead code.

**Fix:**
- Pick one system (recommend `applySystem.js` + `questionFlow.js`)
- Remove or archive `applyTicket.js`
- Clean up dead exports from `index.js`

---

### 4.3 Fix Config Drift (P1-5, P1-6)
**Current:** Hardcoded role IDs disagree between files. `ticket-config.json` GUILD_ID doesn't match live guild. `ratingHandler.js:18` resolves guild by `config.GUILD_ID` which may be wrong.

**Fix:**
- Import all IDs from `config.js` — no hardcoded duplicates
- Confirm `GUILD_ID`, `TICKET_CATEGORY_ID`, `TRANSCRIPT_CHANNEL_ID` match the live server
- Fix `ratingHandler.js:18` to use the interaction's guild, not `config.GUILD_ID`

---

### 4.4 Fix Missing Dependency (P2-3)
**Current:** `Events/guildMemberAdd.js:3` uses `ms` but it's not in `package.json` (works only because discord.js pulls it in transitively).

**Fix:**
- Add `"ms": "^2.1.3"` to `package.json` dependencies

---

### 4.5 Fix pro.db Delete Throw (P2-4)
**Current:** `pro.db` throws when deleting a non-existent key. `db.js:102,114` calls `delete` without guarding.

**Fix:**
- Guard `db.delete()` calls with existence check, or wrap in try/catch
- Or patch `db.js` to silently no-op on missing keys

---

### 4.6 Replace express-session MemoryStore (P2-6)
**Current:** Unbounded in-memory sessions, no cleanup, no persistence across restart.

**Fix:**
- Use a file-based or Redis session store
- At minimum: persist sessions to disk so restart doesn't log everyone out
- Validate `SESSION_SECRET` at startup — fail loudly if missing

---

### 4.7 Add Structured Logging
**Current:** `console.error`/`console.log` throughout. No log levels, no structured data, no log aggregation.

**Fix:**
- Use the `debug` package (already a dependency) or add `winston`/`pino`
- Log with levels: debug, info, warn, error
- Include context: guildId, userId, action, duration
- Makes debugging production issues much easier

---

### 4.8 Fix Fragile Rating Request Detection (P2-8)
**Current:** `index.js:921-922` fetches last 50 messages and string-matches `'// RATING_REQUEST_SENT //'` — brittle and O(50) fetches per close.

**Fix:**
- Store the flag in the `idleSystem` tracker or a dedicated map
- Check the flag instead of scanning messages

---

### 4.9 Single parseDuration (P2-9)
**Current:** `parseDuration` implemented 3× — `utils.js:161`, `Commands/Giveaway/start.js:60`, `Commands/Giveaway/edit.js:66`. The latter two lack multi-char units the utils version supports.

**Fix:**
- Use `utils.parseDuration` everywhere
- Remove duplicate implementations

---

### 4.10 AutoRating Fake Review Opt-Out (P3-3)
**Current:** `ratingSystem/autoRating.js` generates fake "Verified Customer" reviews with fake order numbers, prices, service times — attached to real random members' names. Misrepresentation/impersonation risk.

**Fix:**
- Add a config toggle to disable fake reviews
- Or clearly mark them as "sample" / "demonstration" reviews
- Or remove entirely if the server owner doesn't want them

---

## 5. RELIABILITY & OPERATIONS

### 5.1 Graceful Restart on Crash
**Current:** Single-process, single-instance. If bot crashes, everything stops. No auto-restart mechanism.

**Add:**
- Process manager: `pm2`, `systemd`, or a simple watchdog script
- Health check endpoint on the Express server (`/health`)
- Alert on crash (email, Discord webhook, or log to a monitoring service)

---

### 5.2 Fix Express Server Port Double-Log (P3-1)
**Current:** `server.js:383` prints `Server is running on http://localhost:3000:3000` (domain already includes port).

**Fix:**
- Check if `process.env.DOMAIN` already includes a port before appending `:3000`

---

### 5.3 Guard Null Guild Icon (P3-5)
**Current:** `server.js:180-186` — guild icon with `null` icon produces `https://cdn.discordapp.com/icons/id/null.png`.

**Fix:**
- Guard `guild.icon` before building the URL

---

### 5.4 Guard Audit Log First Entry (P2-10)
**Current:** `Events/guildMemberAdd.js:17` — `Logs.entries.first().executor.tag` crashes when audit log has no entries.

**Fix:**
- Check `.first()` exists before accessing `.executor.tag`

---

### 5.5 Guard interaction.guild in ver Button (P3-4)
**Current:** `index.js:304` — `interaction.guild.id` in the `ver` button handler has no null guard.

**Fix:**
- Add `if (!interaction.guild) return;` (already done in some handlers, missing here)

---

### 5.6 Fix Reopen Success String (P3-2)
**Current:** `index.js:1009` — `REOPEN_SUCCESS.replace('{user}', interaction.user)` coerces the user object instead of a user ID.

**Fix:**
- Use `interaction.user.id` or `interaction.user.tag` explicitly

---

### 5.7 Rate Limit Ticket Creation Per Guild
**Current:** 30s cooldown per user only. A multi-account raid can create unbounded channels.

**Add:**
- Per-guild ticket cap (e.g. max 20 open tickets per guild)
- Per-IP rate limit on web endpoints (already partially done via `express-rate-limit`)

---

### 5.8 Fix pro.db CWD-Relative Path (Security)
**Current:** `pro.db` is CWD-relative (`database.json`). If bot is started from another directory, it silently creates a fresh empty database.

**Fix:**
- Resolve to `__dirname` or an absolute path

---

## 6. PRIORITY ORDER (What to Do First)

### 🔴 Immediate (breaks functionality or security)
1. Fix ticket type routing (P0-1)
2. Fix JSON state corruption on shutdown (P1-1)
3. Close verification auth bypass (P1-2)
4. Add staff permission checks to approve/decline (P1-3)
5. Fix hardcoded localhost URL (P1-4)

### 🟡 High impact, low risk
6. Debounce + serialize JSON writes (2.1)
7. Cache pro.db reads in memory (2.2)
8. Use deferReply for slow operations (2.3)
9. Fix giveaway infinite loop (2.4)
10. Replace setTimeout-per-key cooldowns (2.5)
11. Fix config drift (4.3)
12. Consolidate duplicate app systems (4.2)

### 🟢 Feature improvements
13. Real marketplace storefront (3.1)
14. Payment processing — Stripe (3.2)
15. Project state machine (3.3)
16. Originality enforcement gate (3.4)
17. Post-acceptance workflows (3.5)
18. User profiles & reputation (3.6)
19. Developer-project matching (3.7)
20. Delivery & payment release cycle (3.8)

### 🔵 Code quality (do as time allows)
21. Split monolithic index.js (4.1)
22. Add structured logging (4.7)
23. Fix missing `ms` dependency (4.4)
24. Fix pro.db delete throw (4.5)
25. Replace MemoryStore (4.6)
26. Fix fragile rating detection (4.8)
27. Single parseDuration (4.9)
28. AutoRating fake review opt-out (4.10)

### ⚪ Low priority / nice-to-have
29. Notifications beyond Discord (3.9)
30. Health check endpoint + auto-restart (5.1)
31. Per-guild ticket cap (5.7)

---

*Generated: 2026-09-15*
*Based on: AGENT-REPORT.md, AUDIT-REPORT.md, full codebase scan of /home/duke/Projects/Mikasa/*
