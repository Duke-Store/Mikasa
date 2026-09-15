# Mikasa Project — Agent Analysis Report

**Generated:** 2026-09-15  
**Purpose:** Handoff to Agent 2 for implementation planning  
**Project Path:** /home/duke/Projects/Mikasa

---

## 1. Project Overview & Architecture

### What It Is Today

Mikasa (also referred to as "system-bot" / "Lunexis") is a **Discord support & marketplace bot** built on Discord.js v14. It combines:

- A full-featured **ticket system** (open/claim/close/reopen, transcripts, rating)
- A **multi-step question flow engine** (terms → questions → summary → submit)
- A **seller/buyer marketplace submission flow** with AI analysis
- A **developer/staff application system** with portfolio scanning
- A **web dashboard** (Express + EJS + Discord OAuth) for verification and server management
- A **separate Support AI agent** (second Discord bot account) for natural-language support
- **AI evaluation** of seller products and buyer project requests via Groq/Llama

The bot is designed for a **Roblox development community** where:
- **Sellers** submit original maps/games/content to sell
- **Buyers** request custom projects to be built
- **Developers** apply to work on projects
- **Admins** review all submissions within 24h

### Overall Architecture

```
┌─────────────────────────────────────────────────────┐
│                     index.js (entry)                 │
│  - Loads commands (slash + prefix) dynamically       │
│  - Initializes Client (Discord.js) with all intents  │
│  - Starts Express web server (server.js)             │
│  - Registers slash commands via REST API              │
│  - Handles all interactions in one big switch         │
│  - Loads events from Events/ directory               │
└────────────────────────┬────────────────────────────┘
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
┌────▼─────┐      ┌──────▼──────┐    ┌──────▼──────┐
│ question  │      │ projectTicket│    │  applySystem │
│ Flow.js  │      │  .js         │    │  .js         │
│ (session  │      │ (seller/buyer│    │ (dev/staff   │
│  engine)  │      │  flows, AI,  │    │  apps +      │
│           │      │  marketplace)│    │  portfolio   │
└────┬──────┘      └──────┬──────┘    │  scanner)    │
     │                     │           └──────────────┘
     │             ┌───────▼───────┐
     │             │  aiAgents/    │
     │             │ projectEvalu- │
     │             │ ator.js       │
     │             │ (Groq + 3     │
     │             │  agents each)  │
     │             └───────┬───────┘
     │                     │
┌────▼─────────────────────▼──────────────────────────┐
│ server.js                                          │
│  - Express 5 + EJS views                          │
│  - Passport-Discord OAuth                          │
│  - CSRF + reCAPTCHA + Helmet CSP                  │
│  - Rate limiting                                   │
│  - /dashboard, /verify, /auth/discord routes       │
│  - Support AI agent init at bottom                 │
└─────────────────────────────────────────────────────┘
```

### Core Modules

| Module | File | Purpose |
|---|---|---|
| **Entry / Dispatcher** | `index.js` (1411 lines) | Bot startup, command loading, interaction routing, message handling |
| **Web Server** | `server.js` (433 lines) | Express + OAuth + dashboard |
| **Question Flow Engine** | `questionFlow.js` (589 lines) | Session-based multi-step Q&A with edit, confirm, summary |
| **Project/Marketplace Logic** | `projectTicket.js` (677 lines) | Seller flow, buyer flow, admin review, product listing |
| **Developer/Staff Apps** | `applySystem.js` (342 lines) | Application flows + portfolio scanning |
| **AI Evaluation** | `aiAgents/projectEvaluator.js` (356 lines) | Groq-based 3-agent analysis for sellers & buyers |
| **Portfolio Scanner** | `portfolioScanner/index.js` + analyzers | Fake/stolen/AI detection for developer portfolios |
| **Support AI** | `supportAI.js` (217 lines) | Separate bot account, natural conversation, escalation |
| **Ticket System** | `index.js` (embedded) + `idleSystem.js` + `ticket-config.json` | Open/claim/close/reopen, idle timeouts, transcripts |
| **Admin Review Timer** | `adminReviewTimer.js` (168 lines) | 24h escalation for pending reviews |
| **Trusted Clients** | `trustedClients.js` (95 lines) | Spending/referral/role-based trust status |
| **Rating System** | `ratingSystem/` | DM-based star ratings after ticket close |
| **Database** | `db.js` + `pro.db` + JSON files | Key-value storage, projects, marketplace |
| **Utils** | `utils.js` (357 lines) | File I/O, permissions, cooldowns, guild settings, user stats |

---

## 2. Current Features & Capabilities

### ✅ What's Working / Implemented

**Ticket System**
- 5 ticket types: `support`, `buy`, `apply`, `sell`, `buy_req`
- Auto-incrementing ticket counter (persisted in `ticket-config.json`)
- Channel creation with permission overwrites (owner + staff + manager)
- Claim/unclaim by staff
- Close with confirmation, lock channel, generate HTML transcript (via `discord-html-transcripts`)
- Auto-close after 24h inactivity (12h warning + 12h close) via `idleSystem.js`
- Rating prompt (1-5 stars) sent as DM after close
- Transcript auto-sent to log channel + ticket owner

**Question Flow Engine** (`questionFlow.js`)
- Session-based multi-step Q&A stored in memory + persisted to `saved-sessions.json`
- 30-minute TTL with disk restore on bot restart
- Question types: `modal` (text input), `select` (string select menu), `confirm` (agree/decline buttons)
- Edit-before-submit: `edit_question_` select menu lets user jump back to any answered question
- Summary screen with Send/Edit buttons
- Terms display inline in flow (when question has `termsFile`)

**Seller Flow** (`projectTicket.js` — `startSellerFlow` / `handleSellerSubmit`)
- Terms display (from `terms-dev.md`)
- Agree/decline buttons
- Type select (13 role options: Scripter, Builder, Modeler, FVX, SFX, Animator, etc.)
- Questions: Name, Age, Timezone, Product Description, Category (9 options), Originality confirmation, Portfolio links, Price, Terms agree
- AI evaluation via 3 Groq agents (Product Quality, Originality Checker, Market Fit)
- AI report shown to seller before final submit (strengths, weaknesses, score, suggested categories)
- Admin review: accept/decline with reason modal
- Product listed in marketplace via `marketplace/marketplace.js` → `listProduct()`
- 24h escalation timer if admin doesn't respond

**Buyer Flow** (`projectTicket.js` — `startBuyerFlow` / `handleBuyerSubmit`)
- Terms display (from `terms.md`)
- Agree/decline buttons
- Free-text project description modal (4000 char max)
- AI analysis via 3 Groq agents (Viability, Improvement Advisor, Budget & Resource Estimator)
- AI report shown: viability score, winning ideas, negatives, estimated budget (low/mid/high), dev count, complexity, timeline
- Budget + dev count modal
- Payment method select: Per Task / 50% Upfront / After Completion (trusted only)
- Trusted check: spending ≥$120, YouTuber/Streamer/Partner role, or 2+ referrals
- Admin review: accept/decline with reason
- 24h escalation timer

**Payment Methods** (displayed in flow, `index.js` lines 663-741)
- **Method 01 — 50% Upfront:** 50% before work, 50% after completion
- **Method 02 — Per Task:** 3 equal parts, pay-per-milestone
- **Method 03 — After Completion:** Trusted clients only (spent $120+, YouTuber/Streamer/Partner, or 2+ referrals)

**Developer Application** (`applySystem.js`)
- Separate flow for developer vs staff applications
- Questions: Name, Age, Timezone, Role (select from 10 options), Best projects, Availability, Specialty, Payment methods
- Portfolio scanning via `portfolioScanner` (fake/stolen/AI detection, legitimacy scoring 0-100)
- Flagged applications get warning; clean ones get approve/decline buttons
- Admin approve → assigns `DEVELOPER_ROLE_ID`

**Staff Application** (`applySystem.js` — `handleStaffApplyButton`)
- Questions: Name, Age, Timezone, Moderation experience, Reason, Availability, Terms agree
- Submitted to admin channel for review

**Marketplace** (`marketplace/marketplace.js`)
- In-memory + JSON file storage (`marketplace.json`)
- Product schema: productId, sellerId, sellerTag, name, description, category, price, paymentMethod, originalityStatus, status (listed/sold/removed), createdAt, boughtById, aiReport
- Functions: `listProduct()`, `getProduct()`, `listAllProducts(category)`, `getSellerProducts(sellerId)`, `purchaseProduct()`, `removeProduct()`, `searchProducts(query)`
- AI originality check runs in background after listing (reuses `evaluateSellerProject`)

**Web Dashboard** (`server.js`)
- Discord OAuth login via `passport-dc`
- `/dashboard` — shows guilds user shares with bot
- `/dashboard/:guildId` — server admin panel (toggle commands, toggle protections) — uses `pro.db`
- `/verify` — verification flow (assigns verify role)
- `/logout`
- reCAPTCHA on `/` → `/verify-recaptcha` → `/home`
- CSRF protection on all non-GET requests
- Helmet CSP with nonce
- Rate limiting (general 100/15min, API 30/min, auth 10/15min)

**Support AI Agent** (`supportAI.js`)
- Separate Discord bot account (needs `SUPPORT_BOT_TOKEN`)
- Listens for DMs, mentions, or messages in support channel
- Uses `getAIResponse()` from `ratingSystem/aiHandler.js` (multi-provider: Gemini, OpenRouter, Groq)
- System prompt defines: friendly tone, escalation triggers (angry, refund, human request, billing, legal), honest uncertainty
- Escalation: pings admin role, logs to `supportAI.json`
- Typing indicator shown while thinking

**AI Infrastructure** (`ratingSystem/aiHandler.js`)
- Multi-provider fallback: Gemini → OpenRouter → Groq
- Session-based chat history (30min TTL, 5min cleanup sweep)
- Model fallback within each provider (e.g., Groq tries `llama-3.3-70b-versatile` → `llama-3.1-8b-instant` → `mixtral-8x7b-32768`)
- Auth error detection (401/403 skips remaining models for that provider)
- Retryable error backoff (429/500/502/503)

**AI Project Evaluator** (`aiAgents/projectEvaluator.js`)
- **Seller agents (3):** Product Quality Evaluator, Originality Checker, Market Fit Analyzer — all `llama-3.3-70b-versatile`
- **Buyer agents (3):** Viability Analyzer, Improvement Advisor, Budget & Resource Estimator — all `llama-3.3-70b-versatile`
- Structured JSON output parsing (strips markdown code blocks)
- Aggregation: average scores, union of strengths/weaknesses/categories, majority classification
- Graceful fallback when no Groq API key: returns neutral placeholder results

**Portfolio Scanner** (`portfolioScanner/`)
- Analyzers: fakeDetector, stolenDetector, aiDetector, legitimacyCheck
- URL analysis: recognized platforms (GitHub, GitLab, DevForum, ArtStation, etc.) vs fake patterns (example.com, placeholder, localhost)
- Age adjustment, non-native language adjustment, borderline case correction
- Scoring 0-100, classification: LEGIT / FAKE / STOLEN / AI_GENERATED / UNCERTAIN
- Scan history persisted per user (last 10 scans)

### ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js (implied by `package.json` — `node index.js`) |
| **Discord library** | `discord.js` v14.25.1 |
| **Web framework** | `express` v5.2.1 + `ejs` v3.1.10 |
| **Auth** | `passport` v0.7.0 + `passport-dc` v1.1.2 (Discord OAuth) |
| **AI providers** | `groq-sdk` v1.3.0, `@google/generative-ai`, `node-fetch` (OpenRouter) |
| **Database** | `pro.db` v3.0.8 (key-value JSON file) + raw JSON files |
| **Security** | `helmet` v8.2.0, `express-rate-limit` v8.5.2, `express-session` v1.19.0 |
| **Transcripts** | `discord-html-transcripts` v3.2.0 |
| **Env** | `dotenv` v16.6.1 |
| **Styling** | Discord.js Components V2 (ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder) |

### 📁 Data Storage (All File-Based)

| File | Content |
|---|---|
| `database.json` | `pro.db` key-value store (command toggles, protection states) |
| `projects.json` | Project store (Map serialized to JSON) |
| `marketplace.json` | Marketplace products |
| `saved-sessions.json` | Question flow sessions (30min TTL) |
| `adminReviewQueue.json` | Pending admin reviews with 24h expiry |
| `trustedClients.json` | Trusted client data (spending, referrals, roles) |
| `guildSettings.json` | Per-guild settings (prefix, log channel, etc.) |
| `userStats.json` | Per-guild user message/voice stats |
| `scanHistory.json` | Portfolio scan history (per user, last 10) |
| `supportAI.json` | Support AI escalation log |
| `project-ai-reviews.json` | AI review snapshots for seller submissions |
| `ticket-config.json` | Ticket system config (counter, roles, channels, messages) |
| `guildSettings.json` | Guild settings |

---

## 3. File Map — Purposes

### Root Files

| File | Lines | Purpose |
|---|---|---|
| `index.js` | 1411 | Main entry: bot init, command loading, interaction router, message handler, ticket creation/close/reopen/claim logic, all marketplace/button handlers |
| `server.js` | 433 | Express web server: OAuth, dashboard, verification, CSRF, rate limiting, Support AI init |
| `config.js` | 21 | Guild ID, channel IDs, role IDs (hardcoded) |
| `db.js` | 184 | `pro.db` wrapper + projects.json load/save |
| `utils.js` | 357 | File I/O, cooldowns, permission helpers, guild settings, user stats, safeRespond, moderation logging |
| `package.json` | 25 | Project metadata + dependencies |
| `package-lock.json` | — | Lockfile |
| `.env` | — | Secrets (DISCORD_TOKEN, API keys, SESSION_SECRET, DOMAIN, etc.) — **not readable** |
| `.gitignore` | 125 | Git ignore rules |
| `ticket-config.json` | 89 | Ticket system config: guild ID, role IDs, category ID, ticket types, messages |
| `terms.md` | 59 | Buyer-facing terms (payment protection, secure transactions, refunds, no DMs) |
| `terms-dev.md` | 37 | Seller/developer terms (payment split 60/40, 90/10, min $100, rules) |
| `guildSettings.json` | — | Per-guild settings data file |
| `userStats.json` | — | Per-guild user stats data file |
| `database.json` | — | pro.db data file |
| `projects.json` | 0 bytes | Empty — project store (initialized at runtime) |
| `marketplace.json` | — | Marketplace products (created at runtime) |
| `saved-sessions.json` | — | Question flow sessions |
| `adminReviewQueue.json` | — | Pending admin reviews |
| `trustedClients.json` | — | Trusted client data |
| `scanHistory.json` | — | Portfolio scan history |
| `supportAI.json` | — | Support AI escalation log |
| `project-ai-reviews.json` | 13413 | AI review snapshots |
| `giveaways.json` | 0 bytes | Giveaway data |
| `userStats.json` | — | User stats |
| `components-v2-report.json` | 78033 | Large report file (possibly AI-generated analysis) |
| `components-v2-fixes.json` | 10073 | Fixes report |
| `traffic-test.js` | 16518 | Traffic testing script |
| `traffic-test-results.txt` | 2557 | Traffic test results |
| `AUDIT-REPORT.md` | 20098 | Audit report |
| `IMPLEMENTATION-PLAN.md` | 25860 | Existing implementation plan (possibly outdated) |
| `AGENT-REPORT.md` | 18105 | **This file** (pre-existing — may be from an earlier agent run) |

### Subdirectories

| Directory | Contents | Purpose |
|---|---|---|
| `Commands/` | 13 subdirs | Slash commands (loaded dynamically): config, general, Giveaway, info, log, moderation, owner, protection, store, ticket, utility |
| `Commands/store/` | `store.js`, `store-setdetails.js`, `store-setticketroom.js` | Simple `/store` command showing configured store details |
| `Commands/ticket/` | `ticketPanel.js` | Ticket starter select menu |
| `Commands/general/` | Help, etc. | General utility commands |
| `Commands/owner/` | Shutdown, setstatus | Owner-only commands |
| `Commands/moderation/` | Moderation commands | Mod tools |
| `Commands/protection/` | Protection commands | Server protection toggles |
| `Commands/utility/` | say, remind, etc. | Utility commands |
| `Commands/info/` | userinfo | Info commands |
| `Commands/log/` | Log commands | Logging |
| `Commands/config/` | Config commands | Server config |
| `PrefixCommands/` | Multiple `.js` files | Prefix command handlers (ratings, admin management, help) |
| `Events/` | `voiceStateUpdate.js`, `roleUpdate.js`, `roleDelete.js` | Discord event handlers |
| `aiAgents/` | `projectEvaluator.js` | AI evaluation agents (seller + buyer) |
| `marketplace/` | `marketplace.js`, `templates/marketplaceEmbed.js` | Marketplace CRUD + Discord embed builders |
| `marketplace/templates/` | `marketplaceEmbed.js` | Embed builders for marketplace display |
| `portfolioScanner/` | `index.js`, `analyzers/`, `templates/`, `utils/` | Portfolio scanning pipeline |
| `portfolioScanner/analyzers/` | fakeDetector, stolenDetector, aiDetector, legitimacyCheck | Individual analysis modules |
| `portfolioScanner/utils/` | preprocessor, scoring, adjustments, urlChecker, keywordSets | Utility modules |
| `portfolioScanner/templates/` | reportEmbed, aiReportEmbed | Report embed builders |
| `ratingSystem/` | `aiHandler.js`, `monitor.js`, `dmHandler.js`, `serverContext.js`, `autoRating.js` | AI chat + rating system |
| `views/` | `index.ejs`, `dashboard.ejs`, `server-dashboard.ejs`, `verify.ejs`, `error.ejs`, `recaptcha.ejs` | EJS templates for web dashboard |
| `public/` | `images/` | Static assets |
| `saved-applications/` | — | Saved application data (purpose unclear) |
| `architectures/` | — | Architecture docs/diagrams? |

### Key Command Files (selected)

| File | Purpose |
|---|---|
| `Commands/store/store.js` | `/store` — shows server store details from guild settings |
| `Commands/store/store-setdetails.js` | `/store setdetails` — admin sets store details text |
| `Commands/store/store-setticketroom.js` | `/store setticketroom` — admin sets ticket room for store |
| `Commands/ticket/ticketPanel.js` | Sends ticket type select menu |
| `ratingHandler.js` | Handles DM rating button clicks (1-5 stars) |
| `ticketLogger.js` | Logs ticket actions + ratings to designated channels |
| `giveaway.js` | Giveaway management |
| `idleSystem.js` | Auto-close inactive tickets (12h warn + 12h close) |
| `protectionEvents.js` | Protection event handlers |
| `savingSystem.js` | Save-and-send utility for applications |
| `ratingSystem/serverContext.js` | Server context prompt for AI |
| `ratingSystem/autoRating.js` | Auto-rating logic |

---

## 4. Gaps vs Client Requirements

### Client's Stated End Goal

> **Seller flow:** terms → agree → choose type → questions with Next/Edit → summary → Send/Edit → AI analysis (strengths, weaknesses, project types suited)
>
> **Buyer flow:** terms → agree → free description → AI analysis (viability, winning ideas, negatives, budget, dev count) → payment (per task / 50% upfront / after completion for trusted only) → admin review (24h max response)
>
> **Support AI:** normal Discord account, natural conversation, escalates to real admin when unsure
>
> **Acceptance rule:** sellers must create original maps/games/content and sell on the server store (no clones, must own sales rights)

### Gap Analysis

| Requirement | Current State | Gap |
|---|---|---|
| **Seller: terms → agree → choose type** | ✅ Implemented (`startSellerFlow` → `handleSellerTermsAgree` → `seller_type_select`) | None — this path works |
| **Seller: questions with Next/Edit** | ✅ Implemented via `questionFlow.js` engine with edit button + `edit_question_` select | None — functioning |
| **Seller: summary → Send/Edit** | ✅ `showSummaryScreen` → `final_submit_` / `back_to_edit_` | None — functioning |
| **Seller: AI analysis (strengths, weaknesses, project types suited)** | ✅ 3 Groq agents return score, strengths, weaknesses, recommendedCategories, originalityAssessment | **Gap:** AI runs *before* final submit, shown to seller — matches requirement. But originality check only runs at listing time, not as a gate. No hard block on clones — just flags for admin. |
| **Buyer: terms → agree → free description** | ✅ `startBuyerFlow` → `handleBuyerTermsAgree` → modal | None — functioning |
| **Buyer: AI analysis (viability, winning ideas, negatives, budget, dev count)** | ✅ 3 Groq agents return all of these | None — functioning |
| **Buyer: payment method selection (per task / 50% upfront / after completion trusted)** | ✅ Payment method select with trusted check | **Gap:** Payment methods are *displayed/informational only* — no actual payment processing. No Stripe/PayPal/Roblox payment integration exists. |
| **Buyer: admin review (24h max)** | ✅ `adminReviewTimer.js` escalates after 24h | ✅ functioning, but escalation is a channel message — no automated SMS/email/other notification |
| **Support AI: normal Discord account, natural conversation** | ✅ `supportAI.js` uses separate bot account, natural tone system prompt | **Gap:** It's a *bot account*, not a "normal" user account. Discord considers bot accounts different from user accounts (no profile pictures in same way, flagged as bot, different presence). Client said "normal Discord account" — this may need to be a userbot (against ToS) or the client's definition of "normal" is loose. |
| **Support AI: escalates to real admin when unsure** | ✅ Escalation triggers + admin role ping + logging | ✅ functioning |
| **Sellers must create original content, no clones, must own sales rights** | ⚠️ Originality check via AI (`originalityAssessment`) + confirmation question ("Is this an original creation?") | **Gap:** No hard enforcement. AI check is advisory. No automated clone detection across existing products. No ownership proof required (no receipt upload, no license check). Admin review is the only gate. |
| **Server store** | ⚠️ `Commands/store/store.js` shows a text description from guild settings | **Gap:** No actual storefront — no product listing UI, no browsing, no search, no purchase flow. Marketplace data exists in `marketplace.json` but there's no command/web UI to display it to users. |
| **Payment processing** | ❌ None | **Major gap.** Payment methods are described in text but no actual money movement. No Stripe, PayPal, Roblox gift card, or any payment gateway. |
| **Post-acceptance: sellers create & sell on server store** | ❌ No workflow for this | **Gap.** After admin accepts a seller, there's no flow for them to upload/create the actual product, set final price, or manage listings. The `listProduct()` call happens at submission time, not after acceptance. |
| **Buyer → accepted → project assignment to developers** | ⚠️ Partial | **Gap:** After admin accepts a buyer request, there's no automated developer matching. The old `projectStore` system has `apply_project_` buttons for developers to apply, but the current buyer flow doesn't create a project in `projectStore` — it goes straight to admin review. |
| **Developer → accepted → work on project → delivery → payment** | ❌ None | **Major gap.** No project workspace, no milestone tracking, no delivery mechanism, no payment release. |
| **Web dashboard for marketplace browsing** | ❌ None | **Gap.** Dashboard only shows guild list + server admin panel. No marketplace browser, no product listings, no user portfolio. |
| **User accounts / profiles** | ❌ Minimal | **Gap.** Discord OAuth exists but only for verification. No user profiles, no purchase history, no seller stats, no reputation system. |
| **Notifications** | ⚠️ In Discord only | **Gap.** No email, no SMS, no push. 24h escalation is a Discord message only. |

### Summary of Major Gaps

1. **No payment processing** — biggest gap. Payment methods are descriptive only.
2. **No real storefront** — marketplace data exists but no UI to browse/buy.
3. **No post-acceptance workflow** — after admin accepts, nothing happens automatically.
4. **No developer-project matching** — buyer requests don't create project listings that developers can apply to.
5. **No delivery/payment release cycle** — no milestone tracking, no delivery mechanism.
6. **Support AI is a bot account, not a "normal" account** — may not meet client's expectation.
7. **Originality enforcement is advisory only** — no hard gate, no ownership proof.
8. **No user profiles or reputation** — no purchase history, no seller ratings visible to buyers.

---

## 5. Technical Approach Suggestions

### Architecture Recommendations

**A. Keep the Discord-first approach but add a real web layer**

The current Express server is primarily for auth + admin panel. To support a real marketplace, you need:

- **Marketplace web UI** — browse products by category, search, product detail pages, seller profiles
- **User dashboard** — purchase history, seller portfolio, earnings, trusted status
- **Admin panel** — review queue with AI scores, batch accept/decline, escalation dashboard

**B. Payment integration strategy**

Options (pick one based on target audience — Roblox community likely uses:

1. **Roblox credit/robux?**** — Not directly integrable via API for third-party payments.
2. **Stripe** — Most viable for USD payments. Requires Stripe account, webhook handling for payment confirmation. Supports 50% upfront (charge first payment intent, capture later) and per-task (create payment for each milestone).
3. **PayPal** — Alternative, but webhook handling is more complex.
4. **Manual (admin witnesses payment in ticket)** — Current implied flow. Lowest tech lift but highest friction and risk.

Recommendation: **Stripe** for real payments. Use Payment Intents for 50% upfront (create → confirm → capture after delivery). For per-task, create separate Payment Intents per milestone. For trusted after-completion, defer all charges until delivery confirmation.

**C. Project lifecycle state machine**

Current state is ad-hoc. Recommended states:

```
SUBMITTED → AI_ANALYSIS → ADMIN_REVIEW (pending/accepted/declined)
  ↓ (accepted)
IN_PROGRESS → (milestones) → DELIVERED → PAYMENT_PENDING → COMPLETED
  ↓ (declined)
CLOSED
```

For sellers (products):
```
SUBMITTED → ADMIN_REVIEW → LISTED → SOLD / REMOVED
```

**D. Database migration**

Current: all JSON files + `pro.db`. This is fine for a single-instance bot but:
- No query capability beyond what's coded
- No relationships
- Risk of corruption on concurrent writes (mitigated by `writeFileAsync` queuing)

For a professional marketplace, consider **SQLite** (via better-sqlite3) at minimum, or **PostgreSQL** if scaling. SQLite gives you: transactions, queries, indexes, relationships (users ↔ products ↔ purchases ↔ reviews). The `pro.db` library can be replaced incrementally.

**E. Support AI — "normal account" concern**

Discord's ToS prohibits userbots (automating user accounts). The current approach (separate bot account) is the compliant way. If the client wants it to *feel* like a normal user:
- Give the bot a human-sounding name and avatar
- Don't use "Bot" in the username (bot accounts still show "Bot" tag though)
- The system prompt already instructs natural tone
- This is likely close enough to "normal Discord account" for practical purposes

**F. Originality enforcement**

Add a hard gate before listing:
1. AI originality check must return `original` or `needs_proof` (not `clone_detected` or `suspicious`)
2. If `needs_proof`, require seller to provide: source files, reference links, proof of ownership
3. Admin review must confirm originality before product goes live

**G. Real storefront**

Build a `/marketplace` web page (EJS or replace with a SPA later):
- Grid of product cards by category
- Search bar
- Product detail: description, seller info, AI originality badge, price, payment method, "Purchase" button
- Purchase creates a Stripe Checkout session or initiates the payment flow

**H. Discord-side integration**

Keep the Discord flows as the primary intake (they work well), but bridge to the web:
- After seller acceptance, DM seller a link to their seller dashboard to upload final assets
- After buyer acceptance, DM buyer a link to payment
- Use Discord buttons/links to drive users to the web app for payment, browsing, and account management

### Specific Implementation Priorities (for Agent 2's plan)

1. **Payment infrastructure** — Stripe integration, payment method models, webhook handler
2. **Marketplace web UI** — browse, search, product detail, purchase flow
3. **Post-acceptance workflows** — seller asset upload, buyer payment, developer assignment
4. **Project state machine** — formalize states, transitions, and what each triggers
5. **Database upgrade** — SQLite for structured data (users, products, purchases, reviews)
6. **Originality gate** — hard block on clone_detected, proof requirement for needs_proof
7. **User profiles** — seller page, purchase history, trusted status visibility
8. **Admin dashboard enhancements** — review queue with AI scores, escalation view, override controls

---

## 6. Risks & Dependencies

### External Dependencies

| Dependency | Risk | Mitigation |
|---|---|---|
| **Groq API** (`GROQ_API_KEY`) | Rate limits, key expiry, model deprecation. If key is missing/invalid, AI evaluation returns neutral fallback (degrades UX but doesn't crash). | Multi-model fallback within Groq. Consider adding fallback to another provider (OpenRouter already in `aiHandler.js` but not used by `projectEvaluator.js`). |
| **Discord API** | Rate limits on channel creates, permission edits, mass DMs. Bot token expiry/rotation. | Current code handles many errors gracefully. Bot token is long-lived. |
| **Discord OAuth** (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`) | Required for web dashboard login. If misconfigured, no one can log in. | Standard OAuth — regenerate if needed. |
| **reCAPTCHA** (`RECAPTCHA_SECRET`) | Required for `/` → `/home` flow. If missing, verification fails. | Can disable if not needed. |
| **Passport-Discord** | Depends on Discord OAuth2. If Discord changes OAuth, may break. | Low risk — OAuth2 is stable. |
| **Express Session** | Session data stored in memory by default. Restart loses all sessions. | `SESSION_SECRET` in `.env` — if not set, random secret used and sessions lost on restart. Should persist to disk or use Redis. |
| **Stripe** (if added) | New dependency. Webhook signature verification, PCI compliance (handled by Stripe Elements/Checkout). | Use Stripe Checkout or Payment Intents with frontend redirect. No raw card data touches your server. |

### Internal / Code Risks

| Risk | Detail |
|---|---|
| **Monolithic `index.js`** | 1411 lines with all interaction handling in one file. Hard to maintain, test, or extend. High risk of regression when adding new features. Recommendation: split into modules (ticket handlers, marketplace handlers, flow handlers). |
| **All JSON file storage** | No transactions. Concurrent writes could corrupt files (mitigated by write queuing but not atomic). No query capability. Schema changes require migration code. |
| **In-memory session store** | `activeSessions` Map + `saved-sessions.json` persist. 30min TTL. If bot crashes, sessions beyond TTL are lost. Acceptable for current scale. |
| **Hardcoded guild/channel/role IDs** | `config.js` has IDs for one specific guild. Not multi-server capable without rework. |
| **`pro.db` file-based key-value** | Single file, no indexing. Fine for toggles but will struggle with marketplace-scale data. |
| **AI prompt reliance** | `projectEvaluator.js` prompts are long and specific. Model updates could change output format. JSON parsing is fragile (regex strips markdown). If LLM returns malformed JSON, the whole evaluation fails and falls back to neutral. |
| **Components V2 usage** | `MessageFlags.IsComponentsV2` used throughout. This is a relatively new Discord feature. If Discord changes Components V2 behavior, many UI elements could break. |
| **No test coverage** | No tests visible. Any change risks regression. |
| **`.env` not in git** | Correct, but also means we can't see what keys are configured. The bot may be running with missing AI keys (fallback mode). |
| **Support AI `getAIResponse` vs `projectEvaluator`** | Two separate AI calling paths: `aiHandler.js` (multi-provider, session-based, for support chat) and `projectEvaluator.js` (Groq-only, no session, for evaluations). Inconsistent. |

### Operational Risks

| Risk | Detail |
|---|---|
| **Single-process, single-instance** | No clustering, no load balancing. If bot crashes, everything stops. Memory monitoring exists but no auto-restart mechanism visible. |
| **No logging infrastructure** | `console.error`/`console.log` throughout. No log aggregation, no structured logging. Hard to debug in production. |
| **24h escalation timer** | Runs in-memory via `setInterval`. If bot restarts, queue is reloaded from JSON but timer resets. Escalation could be delayed if bot is down for hours. |
| **Ticket counter in JSON** | `ticket-config.json` counter is read/written on each ticket open. Race condition if multiple ticket opens happen simultaneously (unlikely but possible). |

### Missing Pieces That Block "Professional Marketplace" Status

1. **Payment processing** — without this, it's a lead-generation form, not a marketplace
2. **Storefront UI** — no way for users to browse or discover products
3. **Post-acceptance workflow** — acceptance doesn't trigger any automated next step
4. **User accounts with history** — no memory of who bought what, no reputation
5. **Developer-project matching** — buyers and developers don't connect automatically
6. **Delivery & release cycle** — no mechanism to deliver work and release payment

---

## 7. Quick Reference — Key File Locations

```
/home/duke/Projects/Mikasa/
├── index.js                          # Main bot entry (1411 lines)
├── server.js                         # Express web server (433 lines)
├── config.js                         # Hardcoded guild/channel/role IDs
├── db.js                             # pro.db + projects.json wrapper
├── utils.js                          # Core utilities (357 lines)
├── package.json                      # Dependencies
├── ticket-config.json                # Ticket system config
├── terms.md                          # Buyer terms
├── terms-dev.md                      # Seller/developer terms
│
├── questionFlow.js                   # Q&A session engine (589 lines)
├── projectTicket.js                  # Seller/buyer flows + admin review (677 lines)
├── applySystem.js                    # Developer/staff applications (342 lines)
├── adminReviewTimer.js               # 24h escalation (168 lines)
├── trustedClients.js                 # Trusted client logic (95 lines)
├── supportAI.js                      # Support AI agent (217 lines)
├── idleSystem.js                     # Auto-close inactive tickets (153 lines)
├── ratingHandler.js                  # DM rating handling
├── ticketLogger.js                   # Ticket action/rating logging
│
├── aiAgents/
│   └── projectEvaluator.js           # Groq AI evaluation (356 lines)
│
├── marketplace/
│   ├── marketplace.js                # Product CRUD (161 lines)
│   └── templates/
│       └── marketplaceEmbed.js       # Discord embed builders (210 lines)
│
├── portfolioScanner/
│   ├── index.js                      # Main scanner (249 lines)
│   ├── analyzers/                    # fake/stolen/ai/legitimacy detectors
│   ├── utils/                        # preprocessor, scoring, adjustments, urlChecker
│   └── templates/                    # reportEmbed, aiReportEmbed
│
├── ratingSystem/
│   ├── aiHandler.js                  # Multi-provider AI chat (200 lines)
│   ├── monitor.js                    # Memory monitoring
│   ├── dmHandler.js                  # DM message handler
│   └── serverContext.js              # Server context prompt
│
├── Commands/                         # Slash commands (13 subdirs)
│   ├── store/                        # /store, /store setdetails, /store setticketroom
│   ├── ticket/                       # ticketPanel.js
│   ├── owner/                        # shutdown, setstatus
│   ├── moderation/                   # mod commands
│   ├── protection/                   # protection toggles
│   ├── utility/                      # say, remind
│   ├── info/                         # userinfo
│   ├── general/                      # help, etc.
│   └── ...                           # log, config, giveaway
│
├── PrefixCommands/                   # Prefix command handlers
├── Events/                           # voiceStateUpdate, roleUpdate, roleDelete
├── views/                            # EJS templates (index, dashboard, verify, error, recaptcha)
├── public/                           # Static assets (images/)
└── saved-applications/               # Saved application data
```

---

## 8. Notes for Agent 2

- **`AGENT-REPORT.md` already existed** (18105 bytes, modified Sep 15 15:06) — this report overwrites it with a fresh analysis.
- **`IMPLEMENTATION-PLAN.md` already exists** (25860 bytes, Sep 15 15:13) — may contain an earlier plan. Agent 2 should review it for continuity but treat this report as the current source of truth.
- **`AUDIT-REPORT.md` exists** (20098 bytes) — likely a prior audit. May contain useful context.
- **Large JSON reports** (`components-v2-report.json` 78KB, `components-v2-fixes.json` 10KB, `project-ai-reviews.json` 13KB) — these appear to be AI-generated analysis artifacts, possibly from prior agent runs. May contain useful data but are not source code.
- **`.env` is unreadable** — cannot confirm which API keys are actually configured. The bot may be running in degraded mode (no Groq key → AI evaluation returns neutral fallback).
- **Existing `AGENT-REPORT.md` was written by a prior agent** — this new report supersedes it.

---

*End of report.*
