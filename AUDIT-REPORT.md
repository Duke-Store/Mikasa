# AUDIT REPORT — "The Main Bot" (Discord.js v14 Bot)

**Auditor:** Agent 1 (Auditor)
**Date:** 2026-08-02
**Scope:** Full codebase scan (121 JS files), static syntax check, module load tests, standalone traffic/stress test, manual code audit.
**No source files were modified.** Only `traffic-test.js` and `traffic-test-results.txt` were added (repo root).

---

## 1. Executive Summary

The bot is a large, feature-rich Discord bot (tickets, applications, project flows, protection systems, giveaways, rating system, portfolio scanner, web dashboard). **The codebase is syntactically healthy**: all 121 `.js` files pass `node --check`, and every module loads without import-time errors. The traffic test passes **10/10** modules with **0 unhandled rejections / 0 uncaught exceptions** and no measurable memory leaks under 1200+ concurrent ops.

However, the audit found **serious functional and reliability problems**, the most critical being:

1. **The ticket type routing is broken** — the ticket panel sends hash-string values that never match the configured ticket types, so ticket labels are "undefined" and the auto-triggered project/apply flows never start.
2. **JSON state files are at risk of truncation/corruption** — many modules write with fire-and-forget async writes and the shutdown path calls `process.exit()` immediately. This was *proven* during testing (see §4.2): `guildSettings.json` was truncated to 0 bytes; it was recovered from git HEAD and verified byte-identical.
3. **Security gaps** — the web verification endpoint has no authentication, and staff-only approve/decline buttons have no staff permission checks.
4. **Two parallel application systems** coexist (legacy `applyTicket.js` + new `applySystem.js`/`questionFlow.js`), with dead code and conflicting behavior.
5. **Config drift** — hardcoded role/guild IDs disagree between files and with the live guild the bot actually runs in.

Performance-wise the pure-logic modules are fast (no slow functions; portfolio scan ~0.26ms/op). The main event-loop risks are the **synchronous `pro.db` file I/O** in every message event and the **un-awaited `.send()` calls** in the Events folder.

---

## 2. Syntax Errors Found

**None.** All 121 `.js` files passed `node --check`:

```
SYNTAX OK - all files passed
```

---

## 3. Module Load Failures

**None.** All pure modules loaded successfully in isolation:

| Module | Load result |
|---|---|
| `config.js`, `utils.js`, `db.js` | OK |
| `savingSystem.js`, `questionFlow.js`, `giveaway.js` | OK |
| `applySystem.js`, `projectTicket.js`, `applyTicket.js`, `idleSystem.js` | OK |
| `ratingHandler.js`, `ticketLogger.js`, `protectionEvents.js` | OK |
| `portfolioScanner/` (index + 4 analyzers + 4 utils + 2 templates) | OK |
| `ratingSystem/` (aiHandler, autoRating, dmHandler, monitor, serverContext) | OK |

**`index.js` caveat:** `require('./index.js')` loads *everything* (62 slash commands, 8 prefix commands, 16 events, Express server) and then **auto-connects to Discord** because a real `DISCORD_TOKEN` exists in `.env` (line 102–106). The process never exits on its own (login + intervals keep the event loop alive), so a load test must be killed. No import-time errors occurred. Notable output during the load test:

```
Logged in as Aurex Bot#9378
[CONFIG WARNING] Guild ID mismatch: bot is in guild 983035130333519922 but ticket-config.json has GUILD_ID 830104403440566272.
[CONFIG WARNING] Guild ID mismatch: bot is in guild 998254643467530443 ...
Server is running on http://localhost:3000:3000   <- double port in log message
```

---

## 4. Traffic Test Results

Test file: `The Main Bot\traffic-test.js` — standalone, **no Discord connection**. It backs up all real JSON state files before running and restores them after (verified byte-identical afterward). Raw output: `The Main Bot\traffic-test-results.txt`.

### 4.1 Final result line

```
FINAL RESULT: ALL PASS — Passed: 10/10, Global unhandledRejections: 0, Global uncaughtExceptions: 0
```

| Module | Iterations | Result | Notes |
|---|---|---|---|
| utils-helpers (format*/parseDuration/cooldowns) | 1000 | PASS | 0 errors, 0 slow (>50ms) |
| utils-writeFileAsync same-file race (500 × 2-way) | 500 | PASS | 0 corrupted writes, 0 rejects |
| db.js get/set/del (1200 concurrent) | 1200 | PASS | 0 thrown errors, files parseable |
| questionFlow sessions (500 concurrent) | 500 | PASS | file parseable, active sessions bounded |
| savingSystem.buildMarkdown (1000 concurrent) | 1000 | PASS | 0 errors |
| portfolioScanner.scanPortfolio (400 concurrent) | 400 | PASS | 0 bad reports, valid classifications |
| autoRating.buildRatingEmbed (600 concurrent) | 600 | PASS | 0 errors |
| giveaway create/join/reroll (50 create + 1000 joins) | 1050 | PASS | participant uniqueness intact |
| aiHandler.getActiveProviders | 1 | PASS | env resolution OK |
| memory sanity | 1 | PASS | heap delta −5.8 MB, RSS 234.8 MB |

Timing highlights: portfolio scan ≈ 0.26 ms/op, giveaway ops ≈ 0.05 ms/op, db ops ≈ 0.19 ms/op — no slow functions detected.

### 4.2 Important incident discovered during testing (must read)

The **first** traffic-test run truncated `guildSettings.json` to **0 bytes**. Root cause: production modules fire-and-forget async file writes (`saveGuildSettingsToFile()` at `db.js:72`, `saveSessionsToDisk()` at `questionFlow.js:92`, `saveGiveawaysToFile()` at `giveaway.js:45`, …) and the test called `process.exit()` while writes were still in flight — exactly what the production shutdown path does (`index.js:1267–1279` calls `process.exit(0)` right after `saveProjects`). The file was recovered byte-identical (3036 bytes) from git HEAD and re-verified.

**This is a real production bug**: every restart/kill can corrupt `guildSettings.json`, `saved-sessions.json`, `giveaways.json`, `scanHistory.json`. See P1-1 below.

The traffic test was then fixed to drain pending writes before restore/exit and re-run clean (10/10 ALL PASS), leaving the repo state untouched.

---

## 5. Prioritized Bug List

### P0 — Critical (breaks core features)

**P0-1. Ticket type routing is broken — project/apply auto-flows never trigger**
- `Commands/ticket/ticketPanel.js:64-77` — the select menu options use **hash values** (`44c530edcff948c5e63764303419e252`, `c0f60f084fc44e99ec904a89f83ffaf6`, `fcdf8716864e453ca93e869a0b25061d`).
- `ticket-config.json:10-32` — `TICKET_TYPES` values are `support` / `buy` / `apply`.
- `index.js:639` — `TICKET_TYPES.find(t => t.value === ticketType) || {}` therefore always returns `{}` → welcome message shows `Type: "undefined"`.
- `index.js:761-767` — `ticketType === 'support' / 'buy' / 'apply'` never matches → **buy tickets never start the project flow, apply tickets never start the apply flow.**
- Fix: use the `TICKET_TYPES` values in `ticketPanel.js`, or map the hashes in `index.js`.

### P1 — High

**P1-1. JSON state corruption on shutdown/restart (proven)**
- `index.js:1267-1279` — SIGINT/SIGTERM → `saveProjects(...)` + `client.destroy()` + immediate `process.exit(0)`.
- Fire-and-forget writes: `db.js:72,110` (`saveGuildSettingsToFile()` un-awaited), `questionFlow.js:92,97` (`saveSessionsToDisk()` un-awaited), `giveaway.js:45,62,76,89,99,119,158` (`saveGiveawaysToFile()` un-awaited), `utils.js:61` (`writeFileAsync` un-awaited inside save functions).
- Fix: queue writes behind a single in-flight writer (promise chain), debounce, and await a drain before `process.exit`.

**P1-2. Web verification endpoint has no authentication (authorization bypass)**
- `server.js:321-377` — `GET /verify` and `POST /verify` do **not** check `req.isAuthenticated()`. Anyone who can view the page (it only needs a guild/user ID in the query string) can submit the form and grant any user the verify role (`member.roles.add(verifyRoleId)`).
- Fix: require OAuth session + guild membership; validate the user owns the Discord account.

**P1-3. Staff-only approve/decline buttons have no permission checks**
- `applySystem.js:254-289` (`handleDevAppApprove`) and `291-316` (`handleDevAppDecline`) — no `isStaffMember` check; any viewer of the applications channel can grant the **Developer role**.
- `projectTicket.js:206-243` (`handleProjectAccept`), `245-259` (`handleProjectDecline`) — same issue for accepting/declining projects.
- Fix: gate on `isStaffMember` (like `index.js:963` does for delete_ticket).

**P1-4. Hardcoded `localhost` verification URL**
- `index.js:306` — `http://localhost:3000/verify?...` — the "ver" button sends this to real users; it is unreachable outside the host machine.
- Fix: use `process.env.DOMAIN` (already used by `server.js:129`).

**P1-5. Hardcoded role ID contradicts config**
- `applyTicket.js:9` — `ADMIN_ROLE_ID = '998259018252419092'` vs `config.js:12` `ROLES.ADMIN = '1502962137612550245'`. The trusted-client flow (`applyTicket.js:345`) pings the wrong role.
- Fix: import from `config.js`.

**P1-6. ticket-config.json GUILD_ID does not match the live guild**
- Load test warnings: bot is in guilds `983035130333519922` and `998254643467530443`; `ticket-config.json:2` GUILD_ID = `830104403440566272`; `ticket-config.json:5` TICKET_CATEGORY_ID not found in either guild.
- Consequences: ticket category checks fail (`index.js:230-241, 664-669`), and `ratingHandler.js:18` resolves the guild for rating DMs by `config.GUILD_ID` → ratings may target the wrong/nonexistent guild.
- Fix: align IDs with the actual server (config issue, verify with owner).

**P1-7. Synchronous blocking DB I/O in the hottest event path**
- `protectionEvents.js:65-70` — every message performs **4 synchronous full-file read/write calls** via `pro.db` (`fs.readFileSync`/`writeFileSync` on `database.json`, which is CWD-relative — see `node_modules/pro.db/index.js`).
- Same pattern in every `Events/*.js` file (e.g. `voiceStateUpdate.js:12`, `messageUpdate.js:14`) and `server.js:230,285,312`.
- Fix: use an in-memory cache + debounced writes, or a real DB; at minimum call through the project's own `db.js` consistently.

### P2 — Medium

**P2-1. 48 un-awaited `.send()` calls in Events/ — silent log loss**
- e.g. `Events/voiceStateUpdate.js:24,33,48,...`, `Events/channelUpdate.js:31,47,...`, `Events/roleUpdate.js:30,...`, `Events/guildUpdate.js:28,...`, `Events/messageUpdate.js:37`, `Events/guildMemberAdd.js:20,31,67`.
- These fire-and-forget promises only surface as global `unhandledRejection` spam (`index.js:95-97`) and can silently drop log messages with no retry.

**P2-2. Duplicate developer-application systems**
- Legacy: `applyTicket.js` (`waitForAnswer` message-based flow, `activeDevSessions`, `validateAnswerWithAI` calling Groq on every answer).
- New: `applySystem.js` + `questionFlow.js` (modal/select/confirm flow).
- `applyTicket.startApplySelection` is exported but never wired into `index.js` — dead code. The `apply_type_select` handler (`index.js:520-523`) is the only live entry of the legacy system, coexisting with `applySystem` flows. Consolidate to one system.

**P2-3. `require('ms')` is not a declared dependency**
- `Events/guildMemberAdd.js:3` uses `ms` but it is absent from `package.json` (works only because discord.js pulls it in transitively). Breaks if discord.js changes.

**P2-4. `pro.db` delete throws when the key is missing**
- `node_modules/pro.db/index.js` (`delete`) throws `TypeError: Theres no data to add to database!` when the key does not exist.
- `db.js:102,114` call `proDb.delete(key)` without guarding → a stale `db.delete()` in commands/events can throw into handlers.

**P2-5. `db.js` `delete` export is easy to misuse**
- `db.js:142` exports `delete: del` — callers must use `db.delete(...)` (`delete` as property name is legal but confusing; the auditor's test initially called `db.del(...)` which threw). Consider exporting `del` too.

**P2-6. Express session store is the default MemoryStore**
- `server.js:105-115` — unbounded in-memory sessions, no cleanup, warning suppressed; `SESSION_SECRET` unset → express-session throws at startup; no `trust proxy` / cookie hardening.
- Fix: use a store (e.g. `connect-session-store`/redis), validate `SESSION_SECRET`, enable `rolling`.

**P2-7. Giveaway ended-check retries deleted messages forever**
- `giveaway.js:129-164` (`checkEndedGiveaways`) — if `messages.fetch` fails (message deleted), the giveaway is not removed and `endTime <= now` stays true → the failed fetch repeats every 10s forever (error spam + wasted API calls).
- Fix: remove the giveaway from the array on error.

**P2-8. Fragile rating-request detection on close**
- `index.js:921-922` — fetches last 50 messages and string-matches `'// RATING_REQUEST_SENT //'` / `cc.content?.includes('Service Rating')`; brittle and O(50) fetches per close. Store the flag in the `idleSystem` tracker instead.

**P2-9. Duplicated duration parsers**
- `parseDuration` implemented 3×: `utils.js:161`, `Commands/Giveaway/start.js:60`, `Commands/Giveaway/edit.js:66` (the latter two also lack the multi-char units the utils version supports). Use `utils.parseDuration`.

**P2-10. Unguarded audit-log first entry**
- `Events/guildMemberAdd.js:17` — `Logs.entries.first().executor.tag` crashes when the audit log has no entry (`.first()` is undefined).
- `Events/guildMemberAdd.js:23` — `Client.GuildsInvites` may be `undefined` if `ClientReady` invite caching failed (`index.js:203-208` swallows errors) → `Invite.uses > undefined.get(...)` crash.

**P2-11. Duplicated ticket-open permission logic**
- `index.js:671-691`, `applyTicket.js:289-300`, `idleSystem.js:35-38` repeat the same permission-overwrite dance. Extract a shared helper.

### P3 — Low

**P3-1.** `server.js:383` — log prints double port: `Server is running on http://localhost:3000:3000` (domain already includes port). Cosmetic.
**P3-2.** `index.js:1009` — `REOPEN_SUCCESS.replace('{user}', interaction.user)` coerces the user object instead of a user id — check the rendered string.
**P3-3.** `ratingSystem/autoRating.js` — generates **fake** "Verified Customer" reviews (order numbers, prices, service times) attached to **real random members' names** (`buildRatingEmbed`, used by `sendrating`/`sendmassratings`) — misrepresentation/impersonation risk, and the prefix commands have only `ManageGuild` gates. Flag to server owner.
**P3-4.** `index.js:304` — `interaction.guild.id` in the `ver` button handler has no `interaction.guild` null guard (button pressed in guild, but guard anyway like other handlers do).
**P3-5.** `server.js:180-186` — guild icon with `null` icon produces `https://cdn.discordapp.com/icons/id/null.png`; guard `guild.icon`.
**P3-6.** `index.js:87-93` — stats autosave `setInterval` is not `.unref()`; keeps process alive (fine for a bot, note for tests).

---

## 6. Performance / Smoothness Improvements

1. **Debounce + serialize all JSON file writes** (guildSettings, saved-sessions, giveaways, scanHistory, project-ai-reviews, projects, userStats). A single promise-chain writer eliminates races and truncation, and cuts disk I/O by an order of magnitude (e.g. 1000 concurrent participant joins currently trigger 1000 full-file writes — `giveaway.js:45`).
2. **Replace sync `pro.db` reads in hot paths** (`protectionEvents.js:65-70` runs 4 sync file reads per message). Cache in memory, flush periodically.
3. **Use `interaction.deferReply()` + `editReply` for slow commands** (AI scans, transcripts) to avoid the 3-second interaction timeout — currently `transcript_btn` is the only one deferring (`index.js:1024`).
4. **Batch event-log sends** — the 48 un-awaited `.send()` calls should at least be awaited with `.catch`, and identical containers rebuilt per event are expensive; memoize the component builders.
5. **Fix the giveaway ended-check loop** (§P2-7) — prevents an unbounded retry/error loop every 10 seconds.
6. **Cooldown map**: `setCooldown` spawns one `setTimeout` per key (`utils.js:251-258`); replace with a single sweep interval.
7. **Ticket open path** (`index.js:642-646`) scans every channel's permission overwrites per ticket — index by user id instead (e.g. `idleSystem` tracker already knows open tickets).
8. **Avoid `channel.messages.fetch({limit: 10})` on every button click** (`index.js:795, 921, 1093`) — cache the last control message id in the tracker.

---

## 7. Security Concerns

1. **Verification authorization bypass** — `server.js:321-377` (`/verify` GET/POST) has no authentication; anyone can grant any user the verify role. (P1-2)
2. **Missing staff checks on approve/decline buttons** — `applySystem.js:254/291`, `projectTicket.js:206/245`; the Developer role can be granted by any channel viewer. (P1-3)
3. **Hardcoded localhost URL in production messages** — `index.js:306`. (P1-4)
4. **Secrets hygiene** — `.env` is gitignored (verified: `git check-ignore` matches) — good. But `server.js:75` hardcodes a placeholder reCAPTCHA secret fallback and `server.js:106` reads `SESSION_SECRET` with no validation; a bot with a placeholder secret silently fails closed/operates unverified.
5. **Express defaults** — MemoryStore sessions (`server.js:105-115`), no `trust proxy` behind a reverse proxy, `secure` cookie only if DOMAIN starts with https. Harden for production deployment.
6. **No rate limiting on ticket creation** beyond the 30s cooldown (`index.js:275`) — cooldown is per-user and in-memory only; a multi-account raid can create unbounded channels. Consider a per-guild cap.
7. **pro.db is CWD-relative** (`database.json`) — if the bot is started from another directory it silently creates a fresh empty database, losing all protection settings. Fix by resolving to `__dirname`.

---

## 8. Recommendations for Agent 2 (priority order)

1. **Fix ticket type routing (P0-1)** — align `Commands/ticket/ticketPanel.js` select values with `ticket-config.json` `TICKET_TYPES`, or normalize the hashes in `index.js:639,761-767`. Verify with a real ticket creation.
2. **Fix JSON write races + graceful shutdown (P1-1)** — implement a single queued writer for all JSON state files; change `index.js` SIGINT/SIGTERM handlers to await a drain before `process.exit`. Re-run `node traffic-test.js` and confirm the state files stay intact.
3. **Close the verification auth bypass and hardcoded URL (P1-2, P1-4)** — require OAuth authentication on `/verify`; use `process.env.DOMAIN` in `index.js:306`.
4. **Add staff permission checks to all approve/decline/accept handlers (P1-3)** — reuse `isStaffMember` (`index.js:61`), export it from `utils.js`.
5. **Resolve config drift (P1-5, P1-6)** — replace the hardcoded `ADMIN_ROLE_ID` in `applyTicket.js:9` with `config.js`; confirm `GUILD_ID`/`TICKET_CATEGORY_ID`/`TRANSCRIPT_CHANNEL_ID` in `ticket-config.json` match the live server; fix `ratingHandler.js:18` guild resolution to use the interaction's guild.
6. **De-sync the event loop (P1-7, P2-1)** — cache `pro.db` reads in memory with periodic flush; await/catch all event `.send()` calls.
7. **Consolidate the two application systems (P2-2)** — pick `questionFlow`/`applySystem`, remove `applyTicket.js` legacy flow or wire it intentionally.
8. **Fix `ms` dependency (P2-3), pro.db delete guard (P2-4), giveaway ended-loop (P2-7), MemoryStore (P2-6).**
9. Cleanups: single `parseDuration` (P2-9), audit-log guards (P2-10), double-port log (P3-1), autoRating fake-review opt-out (P3-3).

---

## 9. Audit Integrity Notes

- No production files were modified. `traffic-test.js` and `traffic-test-results.txt` are new files at the repo root.
- During the first traffic-test run, `guildSettings.json` was truncated to 0 bytes by in-flight async writes killed by `process.exit()` — a **production-relevant bug** (P1-1). The file was recovered from git HEAD and verified byte-identical (3036 bytes, 3 guilds). All other JSON state files were verified byte-identical after the final run.
- The final traffic-test run (after fixing the test's own drain/exit handling) passed 10/10 with all state files intact and `git status` clean (only the two new files untracked).
