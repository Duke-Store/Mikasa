# PROJECT UNDERSTANDING REPORT
# Mikasa Discord Bot — Professional Marketplace Transformation
# Prepared for Agent 2 (Planning Agent)

---

## 1. PROJECT OVERVIEW

**What it is:** A feature-rich Discord bot ("Aurex"/"Lunexis") built on discord.js v14 with an Express web dashboard. It serves as a ticket-based service marketplace where clients open tickets, submit projects or service requests, developers apply with portfolios, and an AI scanner evaluates applications.

**Repo:** `/home/duke/Projects/Mikasa`
**Stack:** Node.js 14, discord.js v14, Express 5, pro.db (file-based DB), Groq SDK + Google Generative AI + OpenRouter, EJS views, passport-dc (Discord OAuth)

**Architecture:**
- `index.js` (1246 lines) — main event loop, interaction dispatcher, command loader (62 slash + 8 prefix), Express server bootstrap, SIGTERM/SIGINT graceful shutdown
- `server.js` — Express app: Discord OAuth login, dashboard, guild management, verify endpoint, reCAPTCHA, CSRF protection, helmet CSP
- `questionFlow.js` — Q&A session engine: modal/select/confirm questions, progress tracking, session persistence to `saved-sessions.json`, 30-min TTL
- `projectTicket.js` — client project request flow (8 questions), admin review with accept/decline, AI portfolio scan integration
- `applySystem.js` — developer & staff application flows (8 + 7 questions), AI portfolio scanning with fake/stolen detection, approve/decline buttons
- `db.js` — pro.db wrapper (get/set/del with guild-settings routing), projects.json persistence
- `utils.js` — file I/O (queued writes), cooldown map, permission overwrites, isStaffMember/isAdmin, stats tracking
- `ticket-config.json` — ticket types (support/buy/apply), messages, role/channel IDs, counter
- `idleSystem.js` — auto-close tickets after 24h inactivity, 12h warning
- `ratingHandler.js` — DM rating button handler (1-5 stars)
- `savingSystem.js` — saves application answers to markdown files in `saved-applications/`
- `ratingSystem/` — AI-powered DM chat (aiHandler.js), auto-rating spam (autoRating.js), DM handler, memory monitor
- `portfolioScanner/` — AI portfolio analysis (aiAgentScanner.js: 3 Groq agents, aggregation), fake/stolen/AI detectors, scoring, report embeds

**Current flows:**
1. **Ticket open** → select type (support/buy/apply) → welcome message → auto-triggers: buy→project flow, apply→application flow
2. **Project flow** → 8 questions (game_type, payment_method, project_time, details, dev_count, roles_needed, media, terms) → summary embed → admin accept/decline → AI scan → results channel
3. **Developer apply** → 8 questions → markdown saved → AI portfolio scan → approve/decline buttons → role assignment
4. **Staff apply** → 7 questions → markdown saved
5. **DM AI chat** → aiHandler routes to Gemini/OpenRouter/Groq with session memory
6. **Rating** → ticket close → DM rating buttons → log

---

## 2. CURRENT STATE — WHAT EXISTS TODAY

### Working features:
- Full ticket system (open, claim, close, reopen, delete, transcript)
- 3 ticket types with auto-flow triggers
- Project submission with 8 structured questions
- Developer application with AI portfolio scanning (3 Groq agents)
- Staff application
- Web dashboard with Discord OAuth, guild management, command toggles
- DM AI chat (multi-provider: Gemini, OpenRouter, Groq)
- Rating system (DM buttons, auto-rating spam)
- Giveaways
- Moderation commands (warn, clear, mute, timeout, unmute, unlock)
- Idle ticket auto-close
- Config-driven messages and role/channel IDs

### Known issues from AUDIT-REPORT.md (must fix):
- **P0-1:** Ticket type routing broken — ticketPanel.js uses hash values that don't match ticket-config.json TICKET_TYPES → buy/apply flows never auto-trigger
- **P1-1:** JSON state corruption on shutdown (fire-and-forget writes + process.exit)
- **P1-2:** /verify endpoint has no auth — anyone can grant verify role
- **P1-3:** approve/decline buttons lack staff permission checks (applySystem.js + projectTicket.js)
- **P1-4:** Hardcoded localhost URL in ver button
- **P1-5:** Hardcoded ADMIN_ROLE_ID in applyTicket.js (conflicts with config.js)
- **P1-6:** ticket-config.json GUILD_ID doesn't match live guilds
- **P1-7:** Synchronous pro.db I/O in hot paths (protectionEvents.js — 4 sync reads per message)
- **P2-1:** 48 un-awaited .send() calls in Events/
- **P2-2:** Duplicate application systems (legacy applyTicket.js + new applySystem.js)
- **P2-7:** Giveaway ended-check retries deleted messages forever

---

## 3. CLIENT'S REQUEST (Translated from Arabic)

The client wants to transform the bot into a **professional project marketplace** with AI evaluation at every step.

### A. DEVELOPER/SELLER FLOW (people submitting their work for sale)

1. **Professional presentation** — when opening a ticket, FIRST show developer Terms & Conditions
2. **Agree → choose submission type** — if user agrees to terms, let them choose what they're submitting (Script, Scripter, Builder, etc.)
3. **Question-by-question chat flow** — show Q1 with answer field in chat
4. **Navigation** — after answering Q1: "Next" button → Q2, "Edit" button → go back and edit any previous answer
5. **Final summary** — when all questions done, gather ALL info into ONE embed
6. **Submit or Edit** — give two buttons: "Send Submission" or "Edit"
7. **AI analysis on submit** — when sent, AI analyzes everything: evaluation, strengths, weaknesses, what project types they're suited for
8. **If accepted** — they must create maps/games/content and sell on server marketplace. Must be original, must own sales rights. No clones/duplicates.

### B. BUYER/CLIENT FLOW (people requesting to purchase)

1. **Professional presentation** — when opening ticket, FIRST show buyer Terms & Conditions on server
2. **Agree → freedom to describe** — if agreed, give freedom to describe their project as they want, with examples and everything
3. **AI analysis on completion** — when done, AI analyzes: why the project can succeed, highlight winning ideas, project evaluation with negatives that need fixing
4. **Budget + dev count** — determine project budget, how many developers needed (or server determines the count)
5. **Payment methods:**
   - Per task
   - 50% upfront
   - After completion (ONLY for trusted clients — trusted = spent over $120, is YouTuber/Streamer/Partner, or brought 2+ clients)
6. **Admin review** — request sent to server, admin decides accept/reject, reply within 24 hours max

### C. SUPPORT

1. **AI support agent** — normal Discord account that talks naturally like a human
2. **Honest about limits** — if it doesn't know something, says "I don't know" and escalates to a real admin

---

## 4. GAP ANALYSIS — EXISTING vs REQUIRED

### What exists that we can reuse:
| Need | Exists? | File |
|---|---|---|
| Ticket system | ✅ | index.js lines 583-743, ticket-config.json |
| Q&A session engine (modal/select/confirm) | ✅ | questionFlow.js |
| Terms display (ContainerBuilder with terms text) | ✅ | index.js lines 46-50 (termsContainer) |
| Progress tracking | ✅ | questionFlow.js (currentIndex, answers array) |
| Summary embed builder | ✅ | projectTicket.js buildProjectSummaryEmbed() |
| AI analysis (Groq multi-agent) | ✅ | portfolioScanner/aiAgentScanner.js |
| Admin accept/decline buttons | ✅ | projectTicket.js handleProjectAccept/Decline |
| DM AI chat (multi-provider) | ✅ | ratingSystem/aiHandler.js |
| Trusted client detection | ❌ | Need to build — check spending, role, referrals |
| Edit previous answer | ❌ | questionFlow.js only goes forward |
| Per-task / 50% upfront / after-completion payment options | ❌ | Payment method select exists but needs expansion |
| 24-hour admin response timer | ❌ | Need to build |
| AI support agent as Discord account | ❌ | Need to create a user account + DM handler |
| Marketplace / store for selling products | ❌ | Need to build |
| Originality verification (not cloned) | ❌ | Part of AI analysis — extend scanner |

### What needs significant changes:
- `questionFlow.js` — add "edit previous answer" capability, add "Next"/"Edit" buttons at end
- `projectTicket.js` — restructure to match client flow (terms first, then type selection, then questions with edit ability, then AI analysis with strengths/weaknesses/suitability)
- `applySystem.js` — similar restructure for developer applications
- `index.js` — new ticket type handlers, new interaction handlers for edit/submit, support AI agent
- New files: marketplace store, trusted client tracker, support AI agent handler, 24h timer system

---

## 5. TECHNICAL APPROACH

### Core architecture decisions:

1. **Extend questionFlow.js** — not rewrite. Add:
   - `canEdit: true` flag on sessions
   - `editQuestion(index)` function to jump back
   - "Next" and "Edit" buttons after each answer
   - Final summary with "Send" / "Edit" buttons

2. **Two parallel flows** — Developer flow (selling) and Buyer flow (buying), both using questionFlow engine but with different question sets and different AI analysis prompts.

3. **AI analysis prompts** — extend aiAgentScanner.js patterns:
   - For sellers: analyze skills, project quality, originality, what they're suited to sell
   - For buyers: analyze project viability, winning ideas, weaknesses, budget estimate, dev count recommendation

4. **Trusted client system** — new module `trustedClients.js`:
   - Track spending per user (from ticket/transaction data)
   - Check for YouTuber/Streamer/Partner roles
   - Track referral count (clients they brought)
   - Expose `isTrusted(userId)` function

5. **24-hour admin timer** — new module or extend idleSystem:
   - When a project/buyer request is submitted, start a 24h timer
   - If no admin response by deadline, escalate (ping admin role)
   - Track in a Map, persist to JSON

6. **AI support agent** — new Discord user account + handler:
   - Bot account with a separate token
   - Listens to DMs and mentioned messages in support channel
   - Uses aiHandler's getAIResponse but with support-specific system prompt
   - If confidence is low or topic is out of scope → "I don't know, let me connect you with an admin"
   - Escalation: ping real admin or create a staff ticket

7. **Marketplace/store** — new module:
   - Products listed by sellers (maps, games, scripts, etc.)
   - Each product has: sellerId, name, description, price, category, originality status
   - Buyer browsing, purchase flow
   - Integration with payment methods (per-task, 50% upfront, after-completion)

---

## 6. FILES TO MODIFY

| File | Changes |
|---|---|
| `questionFlow.js` | Add edit-previous capability, Next/Edit buttons, final summary with Send/Edit |
| `projectTicket.js` | Restructure flow: terms→type select→questions with edit→summary→AI analysis→admin review. Add buyer flow questions. |
| `applySystem.js` | Align developer apply flow with new marketplace flow. Add AI analysis for seller suitability. |
| `index.js` | New interaction handlers: edit_question, submit_project, submit_buyer_request, support_ai_message. Fix P0-1 (ticket routing). Fix P1-2, P1-3, P1-4 security issues. Add support AI agent event handling. |
| `ticket-config.json` | Add new ticket types for marketplace (sell_project, buy_project), new message templates |
| `config.js` | Add SUPPORT_BOT_USER_ID, MARKETPLACE channels, TRUSTED role IDs |
| `utils.js` | Add trusted client helpers, 24h timer utilities |
| `server.js` | Add marketplace dashboard pages (list products, submit product, browse requests) |
| `portfolioScanner/aiAgentScanner.js` | Add new agent configs for project evaluation (seller suitability, buyer project viability) |
| `ratingSystem/aiHandler.js` | Reuse for support AI — add support-specific system prompt option |

---

## 7. FILES TO CREATE

| File | Purpose |
|---|---|
| `marketplace/marketplace.js` | Product listing, purchase flow, originality tracking |
| `marketplace/templates/marketplaceEmbed.js` | Embed builders for product listings, store browse |
| `trustedClients.js` | Trusted client detection (spending, roles, referrals) |
| `supportAI.js` | Support AI agent handler (DM + channel mentions, escalation) |
| `adminReviewTimer.js` | 24-hour admin response timer with escalation |
| `aiAgents/projectEvaluator.js` | New AI agents for: seller evaluation, buyer project analysis, originality check |
| `aiAgents/templates/projectEvalEmbed.js` | Embed for AI project evaluation results (strengths, weaknesses, suitability) |
| `commands/marketplace/*.js` | Slash commands for marketplace (list products, submit product, browse requests) |
| `views/marketplace/` | EJS views for web marketplace dashboard |

---

## 8. AI INTEGRATION POINTS

1. **Seller submission AI** (on project submit):
   - Analyze: skills match, project quality, originality (not cloned), what categories they're suited for
   - Output: rating, strengths, weaknesses, recommended project types, confidence

2. **Buyer request AI** (on buyer submit):
   - Analyze: why project can succeed, winning ideas, weaknesses to fix, budget estimate, dev count recommendation
   - Output: viability score, winning ideas list, fix list, budget range, dev count recommendation

3. **Originality check** (part of seller AI):
   - Detect if project is cloned from known templates/other sellers
   - flag as "needs original proof" if suspicious

4. **Support AI agent** (real-time DM/channel):
   - Uses existing aiHandler infrastructure
   - Support-specific system prompt
   - Low-confidence → escalate to admin

5. **Existing portfolio scanner** — keep for developer applications, extend with project evaluation agents

---

## 9. DATABASE / STATE

### New data to store:
- `marketplace.json` — products for sale: `{ productId, sellerId, sellerTag, name, description, category, price, paymentMethod, originalityStatus, status (listed/sold/removed), createdAt }`
- `trustedClients.json` or pro.db keys — per-user: `{ spending, referrals, isYouTuber, isStreamer, isPartner, trustedSince }`
- `adminReviewQueue.json` — pending admin reviews: `{ requestId, type (sell/buy), userId, userTag, submittedAt, expiresAt (24h), status (pending/accepted/declined), adminResponse }`
- `supportAI.json` — support AI escalation log: `{ userId, channelId, issue, escalatedAt, handledBy }`

### Existing data to extend:
- `projects.json` — add buyer_request type, budget, paymentMethod, trustedFlag
- `userStats.json` — add spending tracking per user

---

## 10. PRIORITY ORDER (what to build first)

### Phase 1 — Foundation (must have):
1. Fix P0-1: ticket type routing (hash values → correct values)
2. Fix P1-2, P1-3, P1-4: security holes (auth on /verify, staff checks on buttons, localhost URL)
3. Extend questionFlow.js: edit previous answer, Next/Edit buttons
4. Add terms-first flow to projectTicket.js and applySystem.js

### Phase 2 — Core marketplace:
5. Build seller flow: terms → type select → questions with edit → summary → AI analysis → submit
6. Build buyer flow: terms → free description → AI analysis → budget/dev count → admin review with 24h timer
7. Trusted client detection module
8. AI project evaluator (seller + buyer analysis prompts)

### Phase 3 — Marketplace + support:
9. Marketplace store module (list, browse, purchase)
10. Support AI agent (Discord account + DM/channel handler + escalation)
11. Web dashboard marketplace pages
12. Payment method expansion (per-task, 50% upfront, after-completion)

### Phase 4 — Polish:
13. Fix remaining audit issues (P1-1 JSON corruption, P1-7 sync DB I/O, P2-1 un-awaited sends, P2-2 duplicate systems)
14. Originality verification integration
15. 24h admin response timer with escalation

---

## 11. CLIENT MESSAGE (Original Arabic)

> التقديم يصير احترافي
> اول ما يفتح تكت توريه قوانين و شروط المطورين و لو وافق عليها يختار لشو بدو يقدم لو اختار سكربتر متلا بتعطيه السوال الأول و الإجابة يكتبها بالشات و لما يخلص السوال الأول يقدر يضغط تم و يروح السوال التاني و يقدر يضغط تعديل و يرجع يعدل السوال و لما يخلص تتجمع كل المعلومات الي كتبها ب امبد وحدة و تعطيه خيارين ارسال التقديم او تعديل و لما يبعته ai يحلل كل شي و يعطينا تقييم و شو هو بارع فيه و شو الي ضعيف فيه و شو نوع المشاريع الي يعرف لها
> و لو انقبلت لازم تصنع مابات او العاب او اي شي و تبيعها عندنا بالمتجر شرط ما تكون مقلدة او غيرها و تكون تمتلك حقوق بيعها
> بالنسبة للمشتري لما يفتح تكت اول شي يشوف امبد ل شروط و قوانين المشتري بالسيرفر و لو وافق تعطيه الحرية يوصف مشروعه زي ما بده مع أمثلة و كل شي و لما يخلص ai يحلل معه اجابيات المشروع و ليش يقدر ينجح و أبرز الافكار الي تقدر تنجح المشروع و يعطيه تقييم للمشروع مع شوية سلبيات يحتاج يعدلها و بعدها يحدد budget للمشروع و كم مطور بتيحتاج او يقدر يخلينا احنا نحدد عدد المطورين المطلوبين و يحدد طريقة دفعه per task 50%upfront او after completion و هادي الأخيرة بس للعملاء الموتوقين بعدها يتم ارسال طلبه لنا و نقرر نقبله او نرفضه و الرد بيجيه بحد أقصى 24 ساعة
> و بالنسبة ل support لازم يكون في ai agent بحساب طبيعي يتكلم و يرد على الأسئلة بشكل طبيعي زي البشر و لو في شي ما يعرف له يقول ما اعرف و يننشن اداري حقيقي
